import { useQueryClient } from "@tanstack/react-query";
import { HR_ORG_ID } from "../lib/constants";
import { rpcErrorMessage } from "../lib/hrApi";
import { nowTimeInTz } from "../lib/employeeTimezone";
import { wtmBreakIn, wtmBreakOut, wtmClockIn, wtmClockOut } from "../lib/wtmApi";
import type { WtmSessionRow } from "../lib/wtmTypes";

export function useWtmActions(
  timezone: string,
  fire: (msg: string) => void,
  cycleId?: string,
  cycleStart?: string,
  cycleEnd?: string,
) {
  const qc = useQueryClient();

  const invalidate = async (employeeId: string, workDate: string) => {
    await qc.invalidateQueries({ queryKey: ["wtm-session", employeeId, workDate] });
    await qc.invalidateQueries({ queryKey: ["wtm-breaks"] });
    await qc.invalidateQueries({ queryKey: ["wtm-history", employeeId] });
    await qc.invalidateQueries({ queryKey: ["wtm-timeline", employeeId] });
    await qc.invalidateQueries({ queryKey: ["wtm-sessions-today"] });
    await qc.invalidateQueries({ queryKey: ["hr-attendance"] });
    await qc.refetchQueries({ queryKey: ["hr-attendance", HR_ORG_ID, employeeId] });
    await qc.invalidateQueries({ queryKey: ["hr-payroll-lines"] });
    if (cycleId) {
      try {
        const { rebuildPayrollLine } = await import("../lib/hrApi");
        await rebuildPayrollLine(employeeId, cycleId);
      } catch {
        /* cycle may be locked */
      }
    }
    void workDate;
    void cycleStart;
    void cycleEnd;
  };

  const clockIn = async (employeeId: string, workDate: string) => {
    try {
      await wtmClockIn(employeeId, workDate, nowTimeInTz(timezone));
      fire("Clocked in successfully");
      await invalidate(employeeId, workDate);
    } catch (e) {
      fire(rpcErrorMessage(e, "Clock in failed"));
    }
  };

  const clockOut = async (session: WtmSessionRow) => {
    try {
      await wtmClockOut(session.id, nowTimeInTz(timezone));
      fire("Clocked out — session completed");
      await invalidate(session.employee_id, session.work_date);
    } catch (e) {
      fire(rpcErrorMessage(e, "Clock out failed"));
    }
  };

  const breakOut = async (session: WtmSessionRow) => {
    try {
      await wtmBreakOut(session.id, nowTimeInTz(timezone));
      fire("Break started");
      await invalidate(session.employee_id, session.work_date);
    } catch (e) {
      fire(rpcErrorMessage(e, "Break out failed"));
    }
  };

  const breakIn = async (session: WtmSessionRow) => {
    try {
      await wtmBreakIn(session.id, nowTimeInTz(timezone));
      fire("Break ended");
      await invalidate(session.employee_id, session.work_date);
    } catch (e) {
      fire(rpcErrorMessage(e, "Break in failed"));
    }
  };

  return { clockIn, clockOut, breakOut, breakIn };
}
