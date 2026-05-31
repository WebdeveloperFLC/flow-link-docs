/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Future Link Consultants'

interface Props {
  requesterName?: string
  hostName?: string
  meetingTitle?: string
  whenLabel?: string
  durationMin?: number
  meetingLink?: string
  confirmUrl?: string
  rescheduleUrl?: string
  declineUrl?: string
  remarks?: string
}

const AppointmentApproved = ({
  requesterName, hostName, meetingTitle, whenLabel, durationMin,
  meetingLink, confirmUrl, rescheduleUrl, declineUrl, remarks,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{meetingTitle ?? 'Your meeting'} has been approved — please confirm attendance</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your meeting is approved</Heading>
        <Text style={text}>
          {requesterName ? `Hi ${requesterName},` : 'Hi,'} {hostName ?? 'Your host'} has approved your meeting request.
          Please confirm your attendance below.
        </Text>

        <Section style={card}>
          <Text style={label}>Meeting</Text>
          <Text style={value}>{meetingTitle ?? 'Meeting'}</Text>
          <Text style={label}>When</Text>
          <Text style={value}>{whenLabel}</Text>
          {durationMin ? (<>
            <Text style={label}>Duration</Text>
            <Text style={value}>{durationMin} minutes</Text>
          </>) : null}
          <Text style={label}>Host</Text>
          <Text style={value}>{hostName}</Text>
          {meetingLink ? (<>
            <Text style={label}>Meeting link</Text>
            <Text style={value}><a href={meetingLink} style={linkStyle}>{meetingLink}</a></Text>
          </>) : null}
          {remarks ? (<>
            <Text style={label}>Notes from host</Text>
            <Text style={value}>{remarks}</Text>
          </>) : null}
        </Section>

        <Section style={{ textAlign: 'center', margin: '28px 0 8px' }}>
          <Button href={confirmUrl} style={btnPrimary}>Confirm attendance</Button>
        </Section>
        <Section style={{ textAlign: 'center', margin: '8px 0' }}>
          <Button href={rescheduleUrl} style={btnSecondary}>Request reschedule</Button>
          {'  '}
          <Button href={declineUrl} style={btnDanger}>Decline meeting</Button>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>— The {SITE_NAME} team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AppointmentApproved,
  subject: (d: Record<string, any>) => `Your meeting is approved: ${d?.meetingTitle ?? 'please confirm attendance'}`,
  displayName: 'Appointment approved — confirm attendance',
  previewData: {
    requesterName: 'Jane', hostName: 'Alex Carter', meetingTitle: 'Discovery call',
    whenLabel: 'Mon, 10 Jun 2026 · 14:30 IST', durationMin: 30,
    meetingLink: 'https://meet.google.com/abc-defg-hij',
    confirmUrl: 'https://example.com/a/sample?action=confirm',
    rescheduleUrl: 'https://example.com/a/sample?action=reschedule',
    declineUrl: 'https://example.com/a/sample?action=decline',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: 'hsl(222, 47%, 8%)', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#444', lineHeight: '1.6', margin: '0 0 16px' }
const card = { backgroundColor: '#f7f8fa', borderRadius: '10px', padding: '16px 18px', margin: '16px 0' }
const label = { fontSize: '11px', color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.04em', margin: '8px 0 2px' }
const value = { fontSize: '14px', color: '#111', margin: '0 0 8px' }
const linkStyle = { color: 'hsl(220, 85%, 32%)', wordBreak: 'break-all' as const }
const btnPrimary = {
  backgroundColor: 'hsl(142, 70%, 30%)', color: '#fff', padding: '12px 28px',
  borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', display: 'inline-block',
}
const btnSecondary = {
  backgroundColor: 'hsl(220, 85%, 32%)', color: '#fff', padding: '10px 18px',
  borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold', fontSize: '13px', display: 'inline-block',
}
const btnDanger = {
  backgroundColor: 'hsl(0, 70%, 45%)', color: '#fff', padding: '10px 18px',
  borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold', fontSize: '13px', display: 'inline-block',
}
const hr = { borderColor: '#eee', margin: '24px 0 12px' }
const footer = { fontSize: '12px', color: '#999', margin: '0' }