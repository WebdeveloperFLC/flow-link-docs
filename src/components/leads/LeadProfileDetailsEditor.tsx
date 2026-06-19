import { useMemo, useState, useEffect } from "react";
import { ProfileEducationPanel } from "@/components/profile/ProfileEducationPanel";
import { ProfileExperiencePanel } from "@/components/profile/ProfileExperiencePanel";
import { ProfileTestsPanel } from "@/components/profile/ProfileTestsPanel";
import type { LeadBackgroundState } from "@/lib/leadBackground";
import {
  applyEducationRecordsToLeadBackground,
  applyExperienceRecordsToLeadBackground,
  applyTestsPatchToLeadBackground,
  educationRecordsFromLeadBackground,
  experienceRecordsFromLeadBackground,
  testsStateFromLeadBackground,
} from "@/lib/leadBackgroundProfileBridge";
import { ensureEducationId, ensureExperienceId } from "@/lib/profile/profileRecordIds";
import type {
  ProfileAptitudeTestId,
  ProfileEnglishTestId,
  ProfileLanguageTestId,
  ProfileTestId,
} from "@/lib/profile/profileTestCatalog";
import { createEmptyAttempt } from "@/lib/profile/testAttempts";
import type { ProfileEducationRecord, ProfileExperienceRecord, TestAttempt } from "@/lib/profile/types";
import type { BackgroundDetailTab } from "@/lib/languageTests";

interface Props {
  value: LeadBackgroundState;
  onChange: (patch: Partial<LeadBackgroundState>) => void;
  activeTab: BackgroundDetailTab;
  /** Bump when dialog opens to collapse all record cards. */
  resetKey?: number;
}

export function LeadProfileDetailsEditor({ value, onChange, activeTab, resetKey = 0 }: Props) {
  const tests = useMemo(() => testsStateFromLeadBackground(value), [value]);
  const education = useMemo(() => educationRecordsFromLeadBackground(value), [value]);
  const experience = useMemo(() => experienceRecordsFromLeadBackground(value), [value]);

  const [selectedEnglishTestId, setSelectedEnglishTestId] = useState<ProfileEnglishTestId | null>(
    tests.active_english_test_id,
  );
  const [selectedAptitudeTestId, setSelectedAptitudeTestId] = useState<ProfileAptitudeTestId | null>("gre");
  const [selectedLanguageTestId, setSelectedLanguageTestId] = useState<ProfileLanguageTestId | null>("french");
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);
  const [expandedEducationId, setExpandedEducationId] = useState<string | null>(null);
  const [expandedExperienceId, setExpandedExperienceId] = useState<string | null>(null);

  useEffect(() => {
    setExpandedAttemptId(null);
    setExpandedEducationId(null);
    setExpandedExperienceId(null);
  }, [resetKey]);

  const patchTests = (next: {
    attempts: TestAttempt[];
    active_attempt_ids: Partial<Record<ProfileTestId, string>>;
    active_english_test_id?: ProfileEnglishTestId | null;
  }) => {
    onChange(applyTestsPatchToLeadBackground(value, next));
  };

  const patchAttempt = (attemptId: string, patch: Partial<TestAttempt>) => {
    const attempts = tests.attempts.map((a) =>
      a.attempt_id === attemptId
        ? {
            ...a,
            ...patch,
            sections: { ...a.sections, ...(patch.sections ?? {}) },
          }
        : a,
    );
    patchTests({
      attempts,
      active_attempt_ids: { ...tests.active_attempt_ids },
      active_english_test_id: tests.active_english_test_id,
    });
  };

  if (activeTab === "tests" || activeTab === "english" || activeTab === "language") {
    return (
      <ProfileTestsPanel
        mode="edit"
        attempts={tests.attempts}
        activeAttemptIds={tests.active_attempt_ids}
        activeEnglishTestId={tests.active_english_test_id}
        selectedEnglishTestId={selectedEnglishTestId ?? tests.active_english_test_id}
        selectedAptitudeTestId={selectedAptitudeTestId}
        selectedLanguageTestId={selectedLanguageTestId}
        expandedAttemptId={expandedAttemptId}
        documentsPlaceholder
        onSelectEnglish={(id) => {
          setSelectedEnglishTestId(id);
          setExpandedAttemptId(null);
        }}
        onSelectAptitude={(id) => {
          setSelectedAptitudeTestId(id);
          setExpandedAttemptId(null);
        }}
        onSelectLanguage={(id) => {
          setSelectedLanguageTestId(id);
          setExpandedAttemptId(null);
        }}
        onExpandAttempt={setExpandedAttemptId}
        onAddAttempt={(testId) => {
          const empty = createEmptyAttempt(testId);
          const attempts = [...tests.attempts, empty];
          const active_attempt_ids = {
            ...tests.active_attempt_ids,
            ...(tests.active_attempt_ids[testId] ? {} : { [testId]: empty.attempt_id }),
          };
          const isEnglish = (["ielts", "pte", "toefl", "celpip", "duolingo"] as const).includes(
            testId as ProfileEnglishTestId,
          );
          setExpandedAttemptId(empty.attempt_id);
          patchTests({
            attempts,
            active_attempt_ids,
            active_english_test_id: isEnglish
              ? (testId as ProfileEnglishTestId)
              : tests.active_english_test_id,
          });
        }}
        onRemoveAttempt={(attemptId) => {
          const removed = tests.attempts.find((a) => a.attempt_id === attemptId);
          const attempts = tests.attempts.filter((a) => a.attempt_id !== attemptId);
          const active_attempt_ids = { ...tests.active_attempt_ids };
          if (removed && active_attempt_ids[removed.test_id] === attemptId) {
            const remaining = attempts.filter((a) => a.test_id === removed.test_id);
            if (remaining.length) {
              active_attempt_ids[removed.test_id] = remaining[remaining.length - 1]!.attempt_id;
            } else {
              delete active_attempt_ids[removed.test_id];
            }
          }
          if (expandedAttemptId === attemptId) setExpandedAttemptId(null);
          patchTests({
            attempts,
            active_attempt_ids,
            active_english_test_id: tests.active_english_test_id,
          });
        }}
        onSetActiveAttempt={(testId, attemptId) => {
          patchTests({
            attempts: tests.attempts,
            active_attempt_ids: { ...tests.active_attempt_ids, [testId]: attemptId },
            active_english_test_id: tests.active_english_test_id,
          });
        }}
        onSetActiveEnglishType={(id) => {
          setSelectedEnglishTestId(id);
          patchTests({
            attempts: tests.attempts,
            active_attempt_ids: tests.active_attempt_ids,
            active_english_test_id: id,
          });
        }}
        onAttemptChange={patchAttempt}
      />
    );
  }

  if (activeTab === "education") {
    return (
      <ProfileEducationPanel
        records={education}
        mode="edit"
        expandedId={expandedEducationId}
        documentsPlaceholder
        onExpand={setExpandedEducationId}
        onAdd={() => {
          const id = ensureEducationId();
          const record: ProfileEducationRecord = {
            id,
            qualification_type: null,
            institution_name: null,
            country: null,
            state_province: null,
            city: null,
            field_of_study: null,
            major: null,
            start_year: null,
            end_year: null,
            status: null,
            grade_type: null,
            score: null,
            backlogs: null,
            notes: null,
            linked_documents: [],
          };
          onChange(applyEducationRecordsToLeadBackground(value, [...education, record]));
          setExpandedEducationId(id);
        }}
        onRemove={(id) => {
          if (expandedEducationId === id) setExpandedEducationId(null);
          onChange(
            applyEducationRecordsToLeadBackground(
              value,
              education.filter((r) => r.id !== id),
            ),
          );
        }}
        onPatch={(id, patch) => {
          onChange(
            applyEducationRecordsToLeadBackground(
              value,
              education.map((r) => (r.id === id ? { ...r, ...patch } : r)),
            ),
          );
        }}
      />
    );
  }

  return (
    <ProfileExperiencePanel
      records={experience}
      mode="edit"
      expandedId={expandedExperienceId}
      documentsPlaceholder
      onExpand={setExpandedExperienceId}
      onAdd={() => {
        const id = ensureExperienceId();
        const record: ProfileExperienceRecord = {
          id,
          company: null,
          country: null,
          state_province: null,
          city: null,
          designation: null,
          department: null,
          employment_type: null,
          start_date: null,
          end_date: null,
          currently_working: false,
          notes: null,
          linked_documents: [],
        };
        onChange(applyExperienceRecordsToLeadBackground(value, [...experience, record]));
        setExpandedExperienceId(id);
      }}
      onRemove={(id) => {
        if (expandedExperienceId === id) setExpandedExperienceId(null);
        onChange(
          applyExperienceRecordsToLeadBackground(
            value,
            experience.filter((r) => r.id !== id),
          ),
        );
      }}
      onPatch={(id, patch) => {
        onChange(
          applyExperienceRecordsToLeadBackground(
            value,
            experience.map((r) => (r.id === id ? { ...r, ...patch } : r)),
          ),
        );
      }}
    />
  );
}
