import {
  Html,
  Body,
  Container,
  Section,
  Text,
  Hr,
} from '@react-email/components';

interface VerificationEmailProps {
  code: string;
  name?: string;
}

export function VerificationEmail({ code, name }: VerificationEmailProps) {
  const greeting = name ? `Hello ${name}` : 'Hello';

  return (
    <Html>
      <Body
        style={{
          backgroundColor: '#f5f5f5',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        }}
      >
        <Container style={{ backgroundColor: '#ffffff', margin: '0 auto', padding: '40px 20px', maxWidth: '600px' }}>
          <Section
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '8px 8px 0 0',
              padding: '30px',
              textAlign: 'center' as const,
            }}
          >
            <Text style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', margin: '0' }}>
              Verify Your Email
            </Text>
          </Section>

          <Section
            style={{
              padding: '40px 30px',
              borderRadius: '0 0 8px 8px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            }}
          >
            <Text style={{ fontSize: '16px', color: '#333333', marginTop: '0' }}>
              {greeting},
            </Text>
            <Text style={{ fontSize: '16px', color: '#333333' }}>
              Thank you for registering with KIP. Please verify your email address by entering the code below:
            </Text>

            <Section style={{ textAlign: 'center' as const, margin: '30px 0' }}>
              <Text
                style={{
                  fontSize: '36px',
                  fontWeight: 'bold',
                  letterSpacing: '8px',
                  color: '#667eea',
                  backgroundColor: '#f5f5f5',
                  padding: '20px',
                  borderRadius: '8px',
                  margin: '0',
                }}
              >
                {code}
              </Text>
            </Section>

            <Text style={{ fontSize: '14px', color: '#666666' }}>
              This code expires in 15 minutes.
            </Text>

            <Hr style={{ margin: '30px 0', borderColor: '#e5e5e5' }} />

            <Text style={{ fontSize: '14px', color: '#999999', textAlign: 'center' as const }}>
              If you didn&apos;t request this, you can safely ignore this email.
            </Text>

            <Section style={{ textAlign: 'center' as const, marginTop: '30px' }}>
              <Text style={{ fontSize: '12px', color: '#999999' }}>KIP — Knowledge Intelligence Platform</Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
