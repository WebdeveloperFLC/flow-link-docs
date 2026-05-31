/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Future Link Consultants'

interface Props {
  requesterName?: string
  hostName?: string
  meetingTitle?: string
  whenLabel?: string
  reason?: string
}

const AppointmentDeclined = ({ requesterName, hostName, meetingTitle, whenLabel, reason }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your meeting request was declined</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Meeting request declined</Heading>
        <Text style={text}>
          {requesterName ? `Hi ${requesterName},` : 'Hi,'} unfortunately {hostName ?? 'your host'} is
          unable to confirm your meeting request {meetingTitle ? `for "${meetingTitle}"` : ''}{whenLabel ? ` on ${whenLabel}` : ''}.
        </Text>
        {reason ? (
          <Section style={card}>
            <Text style={label}>Reason</Text>
            <Text style={value}>{reason}</Text>
          </Section>
        ) : null}
        <Text style={text}>You're welcome to book another time that works for you.</Text>
        <Text style={footer}>— The {SITE_NAME} team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AppointmentDeclined,
  subject: 'Your meeting request was declined',
  displayName: 'Appointment declined',
  previewData: { requesterName: 'Jane', hostName: 'Alex', meetingTitle: 'Discovery call', whenLabel: 'Mon, 10 Jun 2026 · 14:30', reason: 'Conflict with another commitment' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: 'hsl(222, 47%, 8%)', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#444', lineHeight: '1.6', margin: '0 0 16px' }
const card = { backgroundColor: '#fff5f5', borderRadius: '10px', padding: '16px 18px', margin: '16px 0', borderLeft: '3px solid hsl(0, 70%, 45%)' }
const label = { fontSize: '11px', color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.04em', margin: '0 0 2px' }
const value = { fontSize: '14px', color: '#111', margin: '0' }
const footer = { fontSize: '12px', color: '#999', margin: '30px 0 0' }