import { resolveMx } from 'dns/promises';

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Curated blocklist of common disposable/temporary email domains
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'mailinator2.com', 'mailinater.com', 'mailinator.net',
  'tempmail.com', 'temp-mail.org', 'temp-mail.io', 'tempmail.net',
  'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamail.biz',
  'guerrillamail.de', 'guerrillamail.info', 'guerrillamailblock.com', 'sharklasers.com',
  '10minutemail.com', '10minutemail.net', '10minutemail.org', '10minutemail10.com',
  'throwaway.email', 'throwawaymail.com', 'throwam.com', 'throam.com',
  'trashmail.com', 'trashmail.net', 'trashmail.org', 'trashmail.me', 'trashemail.com',
  'fakeinbox.com', 'fakeinbox.net', 'fakemailgenerator.com',
  'yopmail.com', 'yopmail.fr', 'yopmail.net', 'cool.fr.nf', 'jetable.fr.nf',
  'nospam.ze.tc', 'nomail.xl.cx', 'mega.zik.dj', 'speed.1t.fr', 'wasteland.rfc822.org',
  'mailnesia.com', 'maildrop.cc', 'mailnull.com', 'mailcatch.com',
  'getnada.com', 'nada.email', 'tempinbox.com', 'tempinbox.xyz',
  'dispostable.com', 'mintemail.com', 'mohmal.com', 'emailondeck.com',
  'mytrashmail.com', 'mt2009.com', 'thankyou2010.com', 'trash2009.com',
  'trashemail.de', 'spambox.us', 'spam.la', 'spam4.me', 'spamfree24.org',
  'emailfake.com', 'fakeinbox.org', 'emailtemporario.com.br',
  'mail-temp.com', 'crazymailing.com', 'tempsky.com',
  'tempr.email', 'discard.email', 'discardmail.com', 'discardmail.de',
  'spamgourmet.com', 'spamherelots.com', 'spamhereplease.com',
  'spamspot.com', 'spambox.xyz', 'spambox.irishspringrealty.com',
  'spamcowboy.com', 'spamcowboy.net', 'spamcowboy.org', 'spamday.com',
  'spamex.com', 'spamfree.eu', 'spamgoes.in', 'spamhole.com',
  'spamify.com', 'spaml.com', 'spaml.de', 'spamoff.de',
  'spamspot.com', 'spamstack.net', 'spamthis.co.uk', 'spamtroll.net',
  'temp.email.com', 'temp.headstrong.de', 'tempail.com', 'tempalias.com',
  'tempmaildemo.com', 'tempmailer.com', 'tempmailaddress.com',
  'tempomail.fr', 'temporarily.de', 'temporarioemail.com.br',
  'temporaryemail.net', 'temporaryemail.us', 'temporaryforwarding.com',
  'temporaryinbox.com', 'temporarymailaddress.com',
  'tempr.email', 'discard.email', 'discardmail.com', 'discardmail.de',
  'wegwerf-email.de', 'wegwerfadresse.de', 'wegwerfemail.de',
  'wetrash.com', 'willhackforfood.biz', 'willselfdestruct.com',
  'wolfsmail.tk', 'writeme.us', 'wronghead.com', 'wuzup.net',
  'wuzupmail.net', 'wwwnew.eu', 'xagloo.com', 'xemaps.com',
  'xents.com', 'xmaily.com', 'xoxy.net', 'yapped.net', 'yeah.net',
  'yep.it', 'yogamaven.com', 'yomail.info', 'yuurok.com',
  'z1p.biz', 'za.com', 'zehnminuten.de', 'zehnminutenmail.de',
  'zetmail.com', 'zippymail.info', 'zoaxe.com', 'zoemail.net',
  'inboxalias.com', 'incognitomail.com', 'incognitomail.net', 'incognitomail.org',
  'insorg-mail.info', 'instant-mail.de', 'instantemailaddress.com',
  'ipoo.org', 'irish2me.com', 'iwi.net', 'jetable.com',
  'jnxjnw.com', 'jourrapide.com', 'jsrsolutions.com',
  'kaadaa.com', 'kappik.com', 'kimsdisk.com', 'kingsq.ga',
  'kiois.com', 'kir.ch.tc', 'klassmaster.com', 'klassmaster.net',
  'klzlv.com', 'kook.ml', 'kulturbetrieb.info', 'kurzepost.de',
  'lawlita.com', 'lazyinbox.com', 'letthemeatspam.com',
  'lhsdv.com', 'lifebyfood.com', 'link2mail.net', 'litedrop.com',
  'lol.ovpn.to', 'lookugly.com', 'lopl.co.cc', 'lortemail.dk',
  'lovemeleaveme.com', 'lr78.com', 'lroid.com', 'lukop.dk',
  'm4ilweb.info', 'maboard.com', 'mail-hierarchie.net',
  'mail-temporaire.fr', 'mail.by', 'mail.mezimages.net', 'mail.zp.ua',
  'mail2rss.org', 'mail333.com', 'mail4trash.com', 'mailbidon.com',
  'mailblocks.com', 'mailbucket.org', 'mailcat.biz', 'mailcatch.com',
  'mailde.de', 'mailde.info', 'maildrop.cf', 'maildrop.ga',
  'maildrop.gq', 'maildrop.ml', 'maildu.de', 'maildx.com',
  'mailed.ro', 'maileater.com', 'mailexpire.com', 'mailfa.tk',
  'mailforspam.com', 'mailfreeonline.com', 'mailfs.com',
  'mailguard.me', 'mailhazard.com', 'mailhazard.us', 'mailhz.me',
  'mailimate.com', 'mailin8r.com', 'mailinater.com', 'mailincubator.com',
  'mailismagic.com', 'mailjunk.cf', 'mailjunk.ga', 'mailjunk.gq',
  'mailjunk.ml', 'mailjunk.tk', 'mailmate.com', 'mailme.gq',
  'mailme.ir', 'mailme.lv', 'mailme24.com', 'mailmetrash.com',
  'mailmoat.com', 'mailnator.com', 'mailnesia.com', 'mailnull.com',
  'mailorg.org', 'mailpick.biz', 'mailproxsy.com', 'mailrock.biz',
  'mailsac.com', 'mailscrap.com', 'mailseal.de', 'mailshell.com',
  'mailsiphon.com', 'mailslapping.com', 'mailslite.com', 'mailspam.xyz',
  'mailtemp.info', 'mailtothis.com', 'mailzilla.com', 'mailzilla.org',
  'makemetheking.com', 'manybrain.com', 'mbx.cc', 'mega.zik.dj',
  'meinspamschutz.de', 'meltmail.com', 'messagebeamer.de',
  'mezimages.net', 'mierdamail.com', 'migmail.pl', 'migumail.com',
  'mintemail.com', 'mjukgansen.nu', 'moakt.com', 'mobi.web.id',
  'mobileninja.co.uk', 'moburl.com', 'mohmal.com', 'moncourrier.fr.nf',
  'monemail.fr.nf', 'monmail.fr.nf', 'monumentmail.com', 'ms9.mailslite.com',
  'msa.minsmail.com', 'msb.minsmail.com', 'msg.mailslite.com',
  'mspeciosa.com', 'msrc.ml', 'mssaan.ml', 'mxfuel.com',
  'my10minutemail.com', 'myalias.pw', 'mycleaninbox.net', 'myemailboxy.com',
  'mynetstore.de', 'mypacks.net', 'mypartyclip.de', 'myphantomemail.com',
  'myspaceinc.com', 'myspaceinc.net', 'myspacepimpedup.com',
  'mytempemail.com', 'mytempmail.com', 'mytrashmail.com',
  'nabuma.com', 'neomailbox.com', 'nepwk.com', 'nervmich.net',
  'nervtmansen.nl', 'netmails.com', 'netmails.net', 'netzidiot.de',
  'neverbox.com', 'nice-4u.com', 'nincsmail.hu', 'nmail.cf',
  'nnh.com', 'nobulk.com', 'noclickemail.com', 'nogmailspam.info',
  'nomail.pw', 'nomail.xl.cx', 'nomail2me.com', 'nomorespamemails.com',
  'nonspam.eu', 'nonspammer.de', 'noref.in', 'nospam.ze.tc',
  'nospam4.us', 'nospamfor.us', 'nospammail.net', 'nospamthanks.info',
  'notmailinator.com', 'notsharingmy.info', 'nowhere.org', 'nowmymail.com',
  'nurfuerspam.de', 'nus.edu.sg', 'nwldx.com', 'objectmail.com',
  'obobbo.com', 'odnorazovoe.ru', 'ohaaa.de', 'omail.pro',
  'oneoffemail.com', 'onewaymail.com', 'onlatedotcom.info',
  'online.ms', 'oopi.org', 'opayq.com', 'ordinaryamerican.net',
  'otherinbox.com', 'ourklips.com', 'outlawspam.com',
  'ovpn.to', 'owlpic.com', 'pancakemail.com', 'pjjkp.com',
  'plexolan.de', 'poczta.onet.pl', 'politikerclub.de',
  'poofy.org', 'pookmail.com', 'privacy.net', 'privatdemail.net',
  'privy-mail.com', 'privymail.de', 'proxymail.eu', 'prtnx.com',
  'punkass.com', 'putthisinyourspamdatabase.com',
]);

export interface EmailValidationResult {
  valid: boolean;
  reason?: 'invalid_format' | 'disposable' | 'no_mx_records' | 'mx_lookup_failed';
}

export async function isDisposableEmail(email: string): Promise<boolean> {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return true;
  return DISPOSABLE_DOMAINS.has(domain);
}

export async function hasMxRecords(domain: string): Promise<boolean> {
  try {
    const records = await Promise.race([
      resolveMx(domain),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ]);
    return records.length > 0;
  } catch {
    return false;
  }
}

export async function validateEmail(email: string): Promise<EmailValidationResult> {
  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, reason: 'invalid_format' };
  }

  const domain = email.split('@')[1];
  if (!domain) {
    return { valid: false, reason: 'invalid_format' };
  }

  if (await isDisposableEmail(email)) {
    return { valid: false, reason: 'disposable' };
  }

  try {
    const mxValid = await hasMxRecords(domain);
    if (!mxValid) {
      return { valid: false, reason: 'no_mx_records' };
    }
  } catch {
    return { valid: false, reason: 'mx_lookup_failed' };
  }

  return { valid: true };
}

export function isValidEmailFormat(email: string): boolean {
  return EMAIL_REGEX.test(email);
}
