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
  oldWhenLabel?: string
  newWhenLabel?: string
  durationMin?: number
  meetingLink?: string
  confirmUrl?: string
  rescheduleUrl?: string
  declineUrl?: string
}

const ReschedProposed = ({
  requesterName, hostName, meetingTitle, oldWhenLabel, newWhenLabel, durationMin,
  meetingLink, confirmUrl, rescheduleUrl, declineUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>A new time has been proposed for your meeting — please confirm</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New time proposed</Heading>
        <Text style={text}>
          {requesterName ? `Hi ${requesterName},` : 'Hi,'} {hostName ?? 'Your host'} has proposed a new time
          for {meetingTitle ? `"${meetingTitle}"` : 'your meeting'}. Please confirm whether this works for you.
        </Text>
        <Section style={card}>
          {oldWhenLabel ? (<>
            <Text style={label}>Previously</Text>
            <Text style={{ ...value, textDecoration: 'line-through', color: '#888' }}>{oldWhenLabel}</Text>
          </>) : null}
          <Text style={label}>New time</Text>
          <Text style={value}>{newWhenLabel}</Text>
          {durationMin ? (<>
            <Text style={label}>Duration</Text>
            <Text style={value}>{durationMin} minutes</Text>
          </>) : null}
          {meetingLink ? (<>
            <Text style={label}>Meeting link</Text>
            <Text style={value}><a href={meetingLink} style={linkStyle}>{meetingLink}</a></Text>
          </>) : null}
        </Section>
        <Section style={{ textAlign: 'center', margin: '28px 0 8px' }}>
          <Button href={confirmUrl} style={btnPrimary}>Confirm new time</Button>
        </Section>
        <Section style={{ textAlign: 'center', margin: '8px 0' }}>
          <Button href={rescheduleUrl} style={btnSecondary}>Request different time</Button>
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
  component: ReschedProposed,
  subject: (d: Record<string, any>) => `New time proposed: ${d?.meetingTitle ?? 'your meeting'}`,
  displayName: 'Appointment rescheduled — confirm new time',
  previewData: {
    requesterName: 'Jane', hostName: 'Alex', meetingTitle: 'Discovery call',
    oldWhenLabel: 'Mon, 10 Jun · 14:30', newWhenLabel: 'Wed, 12 Jun · 11:00', durationMin: 30,
    confirmUrl: '#', rescheduleUrl: '#', declineUrl: '#',
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
const btnPrimary = { backgroundColor: 'hsl(142, 70%, 30%)', color: '#fff', padding: '12px 28px', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', display: 'inline-block' }
const btnSecondary = { backgroundColor: 'hsl(220, 85%, 32%)', color: '#fff', padding: '10px 18px', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold', fontSize: '13px', display: 'inline-block' }
const btnDanger = { backgroundColor: 'hsl(0, 70%, 45%)', color: '#fff', padding: '10px 18px', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold', fontSize: '13px', display: 'inline-block' }
const hr = { borderColor: '#eee', margin: '24px 0 12px' }
const footer = { fontSize: '12px', color: '#999', margin: '0' }