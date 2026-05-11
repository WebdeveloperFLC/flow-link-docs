/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Future Link Consultants'

interface AssessmentReportProps {
  link?: string
  firstName?: string
  programs?: string[]
}

const AssessmentReportEmail = ({ link, firstName, programs }: AssessmentReportProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Canada immigration assessment report is ready</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{firstName ? `Hi ${firstName},` : 'Hi,'}</Heading>
        <Text style={text}>
          Your Canada immigration assessment report from {SITE_NAME} is ready. This is
          an advisory report only — not a final immigration decision.
        </Text>
        {programs && programs.length > 0 && (
          <Text style={text}>
            <strong>Programs we matched to your profile:</strong><br />
            {programs.join(' • ')}
          </Text>
        )}
        <Section style={{ textAlign: 'center', margin: '30px 0' }}>
          <Button href={link} style={button}>View my report (PDF)</Button>
        </Section>
        <Text style={small}>
          This download link is valid for 7 days. If you have questions, your counselor
          will follow up shortly.
        </Text>
        <Text style={footer}>— The {SITE_NAME} team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AssessmentReportEmail,
  subject: 'Your Canada immigration assessment report',
  displayName: 'Assessment report',
  previewData: { link: 'https://example.com/report.pdf', firstName: 'Jane', programs: ['Express Entry','PNP'] },
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