import { describe, expect, it } from "vitest";
import { queueContactFromItem, type QueueItemWithClient } from "./telecallerQueue";

const base: QueueItemWithClient = {
  id: "q1",
  client_id: null,
  lead_id: null,
  campaign_id: null,
  assigned_agent_id: null,
  priority: 50,
  status: "queued",
  retry_count: 0,
  next_call_at: null,
  last_called_at: null,
  notes: null,
  source: "csv",
  lead_status: "warm",
  created_at: "2026-01-01T00:00:00Z",
  client: null,
  lead: null,
};

describe("queueContactFromItem", () => {
  it("maps legacy client queue rows", () => {
    const contact = queueContactFromItem({
      ...base,
      client_id: "c1",
      client: {
        id: "c1",
        full_name: "Jane Doe",
        phone: "+911234",
        email: "j@x.com",
        country: "India",
        application_type: "Student Visa",
      },
    });
    expect(contact).toMatchObject({ kind: "client", full_name: "Jane Doe", country: "India" });
  });

  it("maps formal lead queue rows", () => {
    const contact = queueContactFromItem({
      ...base,
      lead_id: "l1",
      lead: {
        id: "l1",
        first_name: "Raj",
        middle_name: null,
        last_name: "Kumar",
        phone: "+91999",
        email: null,
        country_of_residence: null,
        interested_countries: ["Canada"],
        visa_services: ["Study Permit"],
      },
    });
    expect(contact).toMatchObject({
      kind: "lead",
      full_name: "Raj Kumar",
      country: "Canada",
      application_type: "Study Permit",
    });
  });
});
