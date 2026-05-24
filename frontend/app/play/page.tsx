'use client';

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Play" };

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

  Gamepad2,
  ScanLine,
  Keyboard,
  Loader2,
  AlertCircle,
  Users,
  Crown,
  ArrowLeft,
  CameraOff,
  Zap,
} from 'lucide-react';

type Step = 'pin' | 'qr' | 'name' | 'lobby' | 'countdown' | 'error';

interface Player {
  playerId: string;
  playerName: string;
}

interface JoinAck {
  roomId: string;
  playerId: string;
  players: Player[];
  status: string;
}

export default function PlayPage() {
  const { theme } = useTheme();
  const router = useRouter();

  const [step, setStep] = useState<Step>('pin');
  const [pin, setPin] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [players, setPlayers] = useState<Player[]>([]);
  const [playerId, setPlayerId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [countdown, setCountdown] = useState(3);

  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanRafRef = useRef<number | null>(null);

  const socketRef = useRef<any>(null);

  const connectSocket = useCallback(async () => {
    if (socketRef.current?.connected) return socketRef.current;

    const { io } = await import('socket.io-client');
    const socket = io(
      typeof window !== 'undefined'
        ? window.location.origin
        : 'http://localhost:3001',
      { path: '/ws/game', transports: ['polling', 'websocket'] }
    );

    socketRef.current = socket;
    return socket;
  }, []);

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnectSocket();
      stopCamera();
    };
  }, [disconnectSocket]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleaned = pin.trim();
    if (!/^\d{6}$/.test(cleaned)) {
      setError('Please enter a valid 6-digit PIN');
      return;
    }
    setStep('name');
  };

  const startCamera = async () => {
    setCameraError('');
    setScanning(true);
    setStep('qr');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        beginQrDetection();
      }
    } catch {
      setCameraError(
        'Could not access camera. Please allow camera permissions or enter the PIN manually.'
      );
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (scanRafRef.current) {
      cancelAnimationFrame(scanRafRef.current);
      scanRafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const beginQrDetection = async () => {
    if (!videoRef.current) return;

    let reader: any = null;
    try {
      const zxing = await import('@zxing/browser');
      reader = new zxing.BrowserQRCodeReader();
    } catch {
      if (typeof (window as any).BarcodeDetector !== 'undefined') {
        reader = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      }
    }

    if (!reader) {
      setCameraError('QR scanning is not supported on this browser. Please enter the PIN manually.');
      stopCamera();
      return;
    }

    const detect = async () => {
      if (!videoRef.current || !scanning) return;

      try {
        let result: string | null = null;

        if (reader.decodeFromVideoElement) {
          const res = await reader.decodeFromVideoElement(videoRef.current);
          if (res) result = res.getText();
        } else {
          const barcodes = await reader.detect(videoRef.current);
          if (barcodes.length > 0) result = barcodes[0].rawValue;
        }

        if (result) {
          const match = result.match(/\d{6}/);
          if (match) {
            setPin(match[0]);
            stopCamera();
            setStep('name');
            return;
          }
        }
      } catch {
      }

      scanRafRef.current = requestAnimationFrame(detect);
    };

    detect();
  };

  const handleBackFromQr = () => {
    stopCamera();
    setCameraError('');
    setStep('pin');
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const name = playerName.trim();
    if (!name || name.length < 2) {
      setError('Please enter a name (at least 2 characters)');
      return;
    }
    if (name.length > 20) {
      setError('Name must be 20 characters or less');
      return;
    }

    setLoading(true);

    try {
      const socket = await connectSocket();

      socket.off('player:joined');
      socket.off('game:countdown');
      socket.off('player:left');
      socket.off('host:changed');
      socket.off('connect_error');

      socket.on('connect_error', () => {
        setError('Could not connect to game server. Please try again.');
        setLoading(false);
      });

      socket.emit(
        'room:join',
        { pin: pin.trim(), playerName: name },
        (ack: JoinAck | { success: false; error: string }) => {
          setLoading(false);

          if ('success' in ack && ack.success === false) {
            setError(ack.error || 'Failed to join room');
            setStep('name');
            return;
          }

          const successAck = ack as JoinAck;
          setPlayerId(successAck.playerId);
          setRoomId(successAck.roomId);
          setPlayers(successAck.players);

          localStorage.setItem('mq_playerId', successAck.playerId);
          localStorage.setItem('mq_roomId', successAck.roomId);
          localStorage.setItem('mq_playerName', name);

          router.push(`/play/${successAck.roomId}`);
        }
      );

      socket.on('player:joined', (data: Player & { playerCount: number }) => {
        setPlayers((prev) => {
          if (prev.some((p) => p.playerId === data.playerId)) return prev;
          return [...prev, { playerId: data.playerId, playerName: data.playerName }];
        });
      });

      socket.on('player:left', (data: { playerId: string; playerCount: number }) => {
        setPlayers((prev) => prev.filter((p) => p.playerId !== data.playerId));
      });

      socket.on('host:changed', () => {
        setPlayers((prev) => [...prev]);
      });

      socket.on('game:countdown', (data: { seconds: number }) => {
        setCountdown(data.seconds);
        setStep('countdown');
      });
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step !== 'countdown') return;
    if (countdown <= 0) {
      router.push(`/play/${roomId}`);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [step, countdown, router]);

  const cardClass = cn(
    'w-full max-w-sm sm:max-w-md relative z-10',
    'rounded-2xl border backdrop-blur-xl p-6 sm:p-8 shadow-2xl',
    theme === 'dark'
      ? 'bg-slate-800/40 border-slate-700/30'
      : 'bg-white/60 border-white/40'
  );

  const inputBase = cn(
    'w-full rounded-xl border py-3 px-4 text-sm font-medium',
    'transition-all duration-300',
    'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'text-center tracking-widest text-lg',
    theme === 'dark'
      ? 'bg-slate-800/80 border-slate-600/50 text-white placeholder-slate-500'
      : 'bg-white/80 border-slate-200/50 text-slate-700 placeholder-slate-400'
  );

  const primaryBtn = cn(
    'w-full rounded-xl py-3 text-sm font-semibold',
    'flex items-center justify-center gap-2',
    'transition-all duration-300',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    theme === 'dark'
      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white'
      : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white',
    'shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30',
    'hover:scale-[1.01] active:scale-[0.99]'
  );

  const secondaryBtn = cn(
    'w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3',
    'border backdrop-blur-sm transition-all duration-300',
    theme === 'dark'
      ? 'bg-slate-800/80 border-slate-700/50 text-slate-300 hover:bg-slate-700 hover:border-slate-600'
      : 'bg-white/80 border-slate-200/50 text-slate-600 hover:bg-white hover:border-slate-300'
  );

  const PinStep = (
    <div className={cardClass}>
      <div className="text-center mb-8">
        <div className={cn(
          'mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl',
          theme === 'dark'
            ? 'bg-blue-500/20 text-blue-400'
            : 'bg-blue-100 text-blue-600'
        )}>
          <Gamepad2 className="h-7 w-7" />
        </div>
        <h1 className={cn('text-2xl font-bold mb-2', theme === 'dark' ? 'text-white' : 'text-slate-800')}>
          Join Game
        </h1>
        <p className={cn('text-sm', theme === 'dark' ? 'text-slate-400' : 'text-slate-600')}>
          Enter the 6-digit PIN from your teacher
        </p>
      </div>

      {error && (
        <div className={cn(
          'rounded-xl p-4 mb-6 text-sm font-medium flex items-center gap-3',
          'bg-red-50 dark:bg-red-900/20',
          'border border-red-200 dark:border-red-800',
          'text-red-600 dark:text-red-400'
        )}>
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handlePinSubmit} className="space-y-4">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 6);
            setPin(v);
            setError('');
          }}
          placeholder="000000"
          className={inputBase}
          autoFocus
        />

        <button type="submit" className={primaryBtn}>
          <Zap className="h-4 w-4" />
          <span>Join</span>
        </button>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className={cn('w-full border-t', theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200/50')} />
          </div>
          <div className="relative flex justify-center">
            <span className={cn('px-3 text-xs font-medium', theme === 'dark' ? 'bg-slate-800/40 text-slate-500' : 'bg-white/60 text-slate-400')}>
              OR
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={startCamera}
          className={secondaryBtn}
        >
          <ScanLine className="h-4 w-4" />
          <span>Scan QR Code</span>
        </button>
      </form>
    </div>
  );

  const QrStep = (
    <div className={cardClass}>
      <div className="text-center mb-6">
        <h2 className={cn('text-xl font-bold mb-1', theme === 'dark' ? 'text-white' : 'text-slate-800')}>
          Scan QR Code
        </h2>
        <p className={cn('text-sm', theme === 'dark' ? 'text-slate-400' : 'text-slate-600')}>
          Point your camera at the teacher&apos;s QR code
        </p>
      </div>

      <div className={cn(
        'relative mb-4 overflow-hidden rounded-xl border',
        theme === 'dark' ? 'border-slate-700/50 bg-slate-900/50' : 'border-slate-200/50 bg-slate-100/50',
        'aspect-square'
      )}>
        {scanning ? (
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            muted
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2">
            <CameraOff className={cn('h-10 w-10', theme === 'dark' ? 'text-slate-600' : 'text-slate-400')} />
            <span className={cn('text-sm', theme === 'dark' ? 'text-slate-500' : 'text-slate-400')}>
              Camera off
            </span>
          </div>
        )}

        {scanning && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-8 border-2 border-dashed border-blue-400/60 rounded-lg" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <ScanLine className="h-8 w-8 text-blue-400/60 animate-pulse" />
            </div>
          </div>
        )}
      </div>

      {cameraError && (
        <div className={cn(
          'rounded-xl p-3 mb-4 text-sm font-medium flex items-center gap-2',
          'bg-red-50 dark:bg-red-900/20',
          'border border-red-200 dark:border-red-800',
          'text-red-600 dark:text-red-400'
        )}>
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}

      <button onClick={handleBackFromQr} className={secondaryBtn}>
        <Keyboard className="h-4 w-4" />
        <span>Enter PIN Manually</span>
      </button>
    </div>
  );

  const NameStep = (
    <div className={cardClass}>
      <div className="text-center mb-8">
        <div className={cn(
          'mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl',
          theme === 'dark'
            ? 'bg-purple-500/20 text-purple-400'
            : 'bg-purple-100 text-purple-600'
        )}>
          <Users className="h-7 w-7" />
        </div>
        <h1 className={cn('text-2xl font-bold mb-2', theme === 'dark' ? 'text-white' : 'text-slate-800')}>
          Enter Your Name
        </h1>
        <p className={cn('text-sm', theme === 'dark' ? 'text-slate-400' : 'text-slate-600')}>
          PIN: <span className="font-mono font-bold tracking-widest">{pin}</span>
        </p>
      </div>

      {error && (
        <div className={cn(
          'rounded-xl p-4 mb-6 text-sm font-medium flex items-center gap-3',
          'bg-red-50 dark:bg-red-900/20',
          'border border-red-200 dark:border-red-800',
          'text-red-600 dark:text-red-400'
        )}>
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleNameSubmit} className="space-y-4">
        <input
          type="text"
          value={playerName}
          onChange={(e) => {
            setPlayerName(e.target.value);
            setError('');
          }}
          placeholder="Nickname"
          maxLength={20}
          disabled={loading}
          className={cn(
            'w-full rounded-xl border py-3 px-4 text-sm font-medium',
            'transition-all duration-300',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            theme === 'dark'
              ? 'bg-slate-800/80 border-slate-600/50 text-white placeholder-slate-500'
              : 'bg-white/80 border-slate-200/50 text-slate-700 placeholder-slate-400'
          )}
          autoFocus
        />

        <button type="submit" disabled={loading} className={primaryBtn}>
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Joining...</span>
            </>
          ) : (
            <>
              <Gamepad2 className="h-4 w-4" />
              <span>Join Game</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setStep('pin');
            setError('');
          }}
          className={cn(
            'w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5',
            'text-sm font-medium transition-colors duration-300',
            theme === 'dark'
              ? 'text-slate-400 hover:text-slate-300'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to PIN</span>
        </button>
      </form>
    </div>
  );

  const LobbyStep = (
    <div className={cardClass}>
      <div className="text-center mb-6">
        <div className={cn(
          'mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl',
          theme === 'dark'
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'bg-emerald-100 text-emerald-600'
        )}>
          <Users className="h-7 w-7" />
        </div>
        <h1 className={cn('text-2xl font-bold mb-1', theme === 'dark' ? 'text-white' : 'text-slate-800')}>
          Lobby
        </h1>
        <p className={cn('text-sm', theme === 'dark' ? 'text-slate-400' : 'text-slate-600')}>
          Waiting for the host to start the game...
        </p>
      </div>

      <div className={cn(
        'rounded-xl p-4 mb-6 text-center',
        'bg-blue-50 dark:bg-blue-900/20',
        'border border-blue-200 dark:border-blue-800'
      )}>
        <p className={cn('text-sm font-medium', theme === 'dark' ? 'text-blue-300' : 'text-blue-700')}>
          You joined as
        </p>
        <p className={cn('text-lg font-bold mt-1', theme === 'dark' ? 'text-white' : 'text-slate-800')}>
          {playerName}
        </p>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className={cn('text-sm font-semibold', theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}>
            Players
          </h3>
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600')}>
            {players.length}
          </span>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {players.map((p) => (
            <div
              key={p.playerId}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5',
                'border transition-all duration-200',
                p.playerId === playerId
                  ? theme === 'dark'
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : 'bg-blue-50 border-blue-200'
                  : theme === 'dark'
                    ? 'bg-slate-800/50 border-slate-700/30'
                    : 'bg-white/50 border-slate-200/50'
              )}
            >
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
                p.playerId === playerId
                  ? theme === 'dark'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-blue-100 text-blue-600'
                  : theme === 'dark'
                    ? 'bg-slate-700 text-slate-300'
                    : 'bg-slate-100 text-slate-600'
              )}>
                {p.playerName.charAt(0).toUpperCase()}
              </div>
              <span className={cn('text-sm font-medium flex-1 truncate', theme === 'dark' ? 'text-slate-200' : 'text-slate-700')}>
                {p.playerName}
                {p.playerId === playerId && (
                  <span className={cn('ml-1.5 text-xs', theme === 'dark' ? 'text-blue-400' : 'text-blue-600')}>
                    (You)
                  </span>
                )}
              </span>
              {p.playerId === playerId && (
                <Crown className={cn('h-4 w-4', theme === 'dark' ? 'text-yellow-400' : 'text-yellow-500')} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className={cn(
        'flex items-center justify-center gap-2 py-3',
        'rounded-xl border',
        theme === 'dark' ? 'border-slate-700/30 bg-slate-800/30' : 'border-slate-200/50 bg-white/40'
      )}>
        <Loader2 className={cn('h-4 w-4 animate-spin', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')} />
        <span className={cn('text-sm font-medium', theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
          Waiting for host...
        </span>
      </div>
    </div>
  );

  const CountdownStep = (
    <div className={cardClass}>
      <div className="text-center py-12">
        <h2 className={cn('text-xl font-bold mb-4', theme === 'dark' ? 'text-white' : 'text-slate-800')}>
          Game Starting!
        </h2>
        <div className={cn(
          'mx-auto flex h-32 w-32 items-center justify-center rounded-full',
          'text-5xl font-black',
          theme === 'dark'
            ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30'
            : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
        )}>
          {countdown}
        </div>
        <p className={cn('mt-6 text-sm', theme === 'dark' ? 'text-slate-400' : 'text-slate-600')}>
          Get ready...
        </p>
      </div>
    </div>
  );

  return (
    <div className={cn(
      'min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden',
      'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50',
      'dark:from-slate-900 dark:via-slate-800 dark:to-slate-900'
    )}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 blur-3xl" />
      </div>

      {step === 'pin' && PinStep}
      {step === 'qr' && QrStep}
      {step === 'name' && NameStep}
      {step === 'lobby' && LobbyStep}
      {step === 'countdown' && CountdownStep}
    </div>
  );
}