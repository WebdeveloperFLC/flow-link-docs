#!/usr/bin/env node
/**
 * Scaffold EU visa JSON content from Germany/UK templates (additive only).
 * Run: node scripts/scaffold-eu-visa-content.mjs
 */
import fs from "fs";
import path from "path";
import { EU_BASE_COUNTRIES } from "./lib/eu-visa-service-registry.mjs";

const ROOT = path.join(process.cwd(), "content/service-library");
const DATE = "9 Jun 2026";

function loadTemplate(name) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, name), "utf8"));
}

function replaceAll(text, pairs) {
  let out = text;
  for (const [from, to] of pairs) {
    out = out.split(from).join(to);
  }
  return out;
}

function schengenReplacements(config) {
  return [
    ["Germany – Student Visa (National D Visa)", config.studentDisplay],
    ["Germany – Visitor / Schengen Visa (Type C)", config.visitorDisplay],
    ["Germany – Student Visa (National D Visa)", config.studentDisplay],
    ["Germany – Visitor / Schengen Visa (Type C)", config.visitorDisplay],
    ["German Embassy", `${config.adjective} Embassy`],
    ["German embassy", `${config.adjective} embassy`],
    ["German Embassy ·", `${config.adjective} Embassy ·`],
    ["German mission", `${config.adjective} mission`],
    ["German labour", `${config.adjective} labour`],
    ["German institution", `${config.adjective} institution`],
    ["German Hochschule", `${config.country} university`],
    ["German", config.adjective],
    ["Germany", config.country],
    ["germany", config.slug],
    ["auswaertiges-amt.de", new URL(config.portalUrl).hostname],
    ["make-it-in-germany.com", new URL(config.portalUrl).hostname],
    ["deutsche-bank.de", new URL(config.portalUrl).hostname],
    ["videx.diplo.de", new URL(config.portalUrl).hostname],
    ["APS certificate for India", `${config.country} admission requirements`],
    ["APS for India", `${config.country} admission docs`],
    ["APS certificate", "admission documentation"],
    ["blocked account", "proof of funds"],
    ["Blocked account", "Proof of funds"],
    ["€11,904", "required living funds"],
    ["If Germany is primary stay, apply via German mission.", `If ${config.country} is primary stay, apply via ${config.adjective} mission.`],
    ["to Germany up to 90 days", `to ${config.country} up to 90 days`],
    ["trips to Germany", `trips to ${config.country}`],
  ];
}

function irelandReplacements(config) {
  return [
    ["UK – Student Visa (Student Route)", config.studentDisplay],
    ["UK – Visitor Visa (Standard Visitor)", config.visitorDisplay],
    ["United Kingdom", config.country],
    ["UKVI", "Irish Immigration Service Delivery"],
    ["UK ", `${config.country} `],
    ["UK,", `${config.country},`],
    ["UK.", `${config.country}.`],
    ["UK’s", `${config.country}'s`],
    ["gov.uk", "irishimmigration.ie"],
    ["CAS is mandatory", config.studentAlertTitle],
    ["No CAS from licensed sponsor = no application. Verify sponsor licence status before promising timelines.", config.studentAlertBody],
    ["British", config.adjective],
    ["UK", config.country],
    ["£524", "€60+ (verify current fee)"],
    ["IHS healthcare surcharge", "IRP registration fee"],
    ["6 months per visit", "up to 90 days (verify stamp)"],
  ];
}

function applyMeta(meta, config, kind) {
  const isStudent = kind === "student";
  meta.displayName = isStudent ? config.studentDisplay : config.visitorDisplay;
  meta.shortDescription = isStudent ? config.studentShort : config.visitorShort;
  meta.version = "v1.0";
  meta.updatedLabel = `Updated ${DATE}`;
  meta.policyAlert = {
    active: true,
    date: DATE,
    summary: isStudent ? config.policyStudent : config.policyVisitor,
  };
  if (isStudent) {
    meta.alert = { title: config.studentAlertTitle, body: config.studentAlertBody };
  } else if (config.schengen) {
    meta.alert = {
      title: "Schengen 90/180 day rule",
      body: "Short-stay visa allows max 90 days in any 180-day period in Schengen area. Counsel clients on cumulative stay limits.",
    };
  } else {
    meta.alert = {
      title: "Not a Schengen visa",
      body: "Ireland is not in Schengen. A separate Irish visa or preclearance may be required — verify on irishimmigration.ie.",
    };
  }
  meta.navBucket = "visa";
  meta.reviewStatus = "active";
  meta.versionStatus = "Live";
  if (meta.performance) {
    meta.performance = { ourRate: 0, industryRate: 0, stats: [{ label: "Files this year", value: "0" }, { label: "Approved", value: "0" }] };
  }
  if (meta.resources?.[0]) {
    meta.resources[0] = {
      title: `${config.country} official immigration portal`,
      url: config.portalUrl,
      description: "Verify current fees, forms, and document lists before counseling.",
    };
  }
  delete meta._instructions;
  return meta;
}

function scaffoldFile(config, kind) {
  const isStudent = kind === "student";
  const templateName = isStudent ? config.studentTemplate : config.visitorTemplate;
  const outName = isStudent ? config.studentFile : config.visitorFile;
  const outPath = path.join(ROOT, outName);
  if (fs.existsSync(outPath)) {
    console.log("SKIP exists", outName);
    return;
  }

  const template = loadTemplate(templateName);
  const pairs = config.schengen ? schengenReplacements(config) : irelandReplacements(config);
  let raw = JSON.stringify(template);
  raw = replaceAll(raw, pairs);
  const meta = applyMeta(JSON.parse(raw), config, kind);
  fs.writeFileSync(outPath, JSON.stringify(meta, null, 2) + "\n");
  console.log("Wrote", outName);
}

for (const config of EU_BASE_COUNTRIES) {
  scaffoldFile(config, "student");
  scaffoldFile(config, "visitor");
}

console.log("Done scaffolding EU visa content.");
