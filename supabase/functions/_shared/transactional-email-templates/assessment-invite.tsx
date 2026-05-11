/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Future Link Consultants'

interface AssessmentInviteProps {
  link?: string
  firstName?: string
}

const AssessmentInviteEmail = ({ link, firstName }: AssessmentInviteProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Take your Canada immigration assessment with {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {firstName ? `Hello ${firstName},` : 'Hello,'}
        </Heading>
        <Text style={text}>
          You have been invited by {SITE_NAME} to take a confidential Canada immigration
          assessment. The assessment is advisory only and helps us identify the immigration
          pathways most likely to fit your profile.
        </Text>
        <Section style={{ textAlign: 'center', margin: '30px 0' }}>
          <Button href={link} style={button}>Start my assessment</Button>
        </Section>
        <Text style={small}>
          Or paste this link into your browser:<br />
          <span style={{ wordBreak: 'break-all' }}>{link}</span>
        </Text>
        <Text style={small}>This invitation link expires in 14 days.</Text>
        <Text style={footer}>— The {SITE_NAME} team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AssessmentInviteEmail,
  subject: 'Your Canada immigration assessment invitation',
  displayName: 'Assessment invitation',
  previewData: { link: 'https://example.com/assessment/invite/sample-token', firstName: 'Jane' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: 'hsl(222, 47%, 8%)', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#444', lineHeight: '1.6', margin: '0 0 16px' }
const small = { fontSize: '12px', color: '#777', lineHeight: '1.5', margin: '0 0 12px' }
const footer = { fontSize: '12px', color: '#999', margin: '30px 0 0' }
const button = {
  backgroundColor: 'hsl(220, 85%, 32%)',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '10px',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '14px',
  display: 'inline-block',
}