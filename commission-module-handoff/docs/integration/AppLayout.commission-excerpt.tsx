  { to: "/institutions/linkage", icon: Link2, label: "CF ↔ UPI Linkage" },
  { to: "/institutions/suggestions", icon: Lightbulb, label: "AI Suggestions" },
];

const commissionsNav: NavItem[] = [{ to: "/commissions", icon: Receipt, label: "Commissions", end: true }];

const digitalSuccessNav: NavItem[] = [
  { to: "/digital-success", icon: Megaphone, label: "Digital Success Hub", end: true },
];

const calendarNav: NavItem[] = [
  { to: "/calendar", icon: CalendarClock, label: "Calendar", end: true },
  { to: "/calendar/settings", icon: SettingsIcon, label: "Availability & Settings" },
  { to: "/calendar/approvals", icon: ClipboardCheck, label: "Approvals" },
  { to: "/calendar/analytics", icon: BarChart2, label: "Analytics" },
  { to: "/calendar/reports", icon: FileStack, label: "Reports" },
  { to: "/calendar/activity", icon: ScrollText, label: "Activity" },
];

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, roles, signOut, isAdmin, hasRole, isCommissionAdmin, viewAsRole, isPlatformOwner } = useAuth();
  useAccountingPermissionsBootstrap();
  const navigate = useNavigate();
  const primaryRole = roles[0] ?? "viewer";
  const roleBadgeLabel = viewAsRole
    ? `Preview · ${viewAsRoleLabel(viewAsRole)}`
    : isPlatformOwner
      ? "Owner"
      : ROLE_LABELS[primaryRole] ?? primaryRole;
  const { hasAccess: hasAccountingAccess, loading: accountingAccessLoading } = useAccountingAccess();
  const { can: canAcct, isAdmin: isAcctAdmin } = useCan();
  const { canView: canViewInstitutions } = useModulePermission("institutions");
  const { canView: canViewCommissions } = useModulePermission("commissions");
  const { canView: canViewDsh } = useModulePermission("digital_success_hub");
  const { canView: canViewHrPayroll } = useModulePermission("hr_payroll");
  const { guides: visibleGuides } = useVisibleGuides();
  const { theme } = useTheme();
  const [hiddenOpen, setHiddenOpen] = useState(false);
                { isAdmin, hasRole: (roles) => hasRole(roles as never) },
              ),
            )}

            {(isAdmin || canViewDsh) && renderSection("digital", "Digital", digitalSuccessNav)}

            {(isAdmin || canViewInstitutions) && renderSection("institution", "Institution", institutionsNav)}

            {(isAdmin || isCommissionAdmin || canViewCommissions) &&
              renderSection("commissions", "Commissions", commissionsNav)}

            {(isAdmin || canViewHrPayroll) &&
              renderSection(
                "hr_payroll",
                "HR Payroll",
                hrPayrollNav.filter(
