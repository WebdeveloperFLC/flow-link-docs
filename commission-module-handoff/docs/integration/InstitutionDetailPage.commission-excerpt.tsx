  const { isCommissionAdmin, isAccountingMember } = useAuth();
  const { canEdit } = useModulePermission("institutions");
  const canSeeCommissions = isCommissionAdmin || isAccountingMember;
  const LockedPanel = ({ label }: { label: string }) => (
    <Card className="p-10 max-w-xl mx-auto text-center space-y-2">
      <Lock className="size-6 mx-auto text-muted-foreground" />
      <div className="text-base font-medium">{label} are restricted</div>
      <div className="text-sm text-muted-foreground">
        Only Commission admins or Accounting admins can view {label.toLowerCase()}.
        Ask an admin to grant the <b>Commission admin</b> role or add you to Accounting users.
      </div>
    </Card>
  );
        {!canEdit && <div className="mb-6"><ViewOnlyNotice /></div>}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
            <TabsTrigger value="documents">Knowledge Sources</TabsTrigger>
            <TabsTrigger value="fee-schedule">Fee Schedule</TabsTrigger>
            {canSeeCommissions && <TabsTrigger value="billing">Billing</TabsTrigger>}
            {canSeeCommissions && <TabsTrigger value="eligibility">Eligibility</TabsTrigger>}
            {canSeeCommissions && <TabsTrigger value="agreements">Agreements</TabsTrigger>}
            {canSeeCommissions && <TabsTrigger value="commissions">Commissions</TabsTrigger>}
            {canSeeCommissions && <TabsTrigger value="claims">Claims</TabsTrigger>}
            {canSeeCommissions && <TabsTrigger value="receipts">Receipts</TabsTrigger>}
            <TabsTrigger value="promotions">Promotions</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="suggestions">AI Suggestions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewPanel institutionId={id} />
          </TabsContent>

          <TabsContent value="fee-schedule">
            <InstitutionFeeSchedulePanel institutionId={id} canEdit={canEdit} />
          </TabsContent>

          <TabsContent value="billing">
            {canSeeCommissions ? <BillingProfilesPanel institutionId={id} /> : <LockedPanel label="Billing" />}
          </TabsContent>

          <TabsContent value="eligibility">
            {canSeeCommissions ? <EligibilityConfigPanel institutionId={id} /> : <LockedPanel label="Eligibility" />}
          </TabsContent>

          <TabsContent value="agreements">
            {canSeeCommissions ? <AgreementsPanel institutionId={id} /> : <LockedPanel label="Agreements" />}
          </TabsContent>

          <TabsContent value="commissions">
            {canSeeCommissions ? <CommissionsPanel institutionId={id} /> : <LockedPanel label="Commissions" />}
          </TabsContent>

          <TabsContent value="claims">
            {canSeeCommissions ? (
              <ClaimsPanel
                institutionId={id}
                onRecordReceipt={(invoiceId) => {
                  setReceiptInvoiceId(invoiceId);
                  setActiveTab("receipts");
                }}
              />
            ) : (
              <LockedPanel label="Claims" />
            )}
          </TabsContent>

          <TabsContent value="receipts">
            {canSeeCommissions ? (
              <CommissionReceiptsPanel
                institutionId={id}
                institutionName={inst.name}
                initialInvoiceId={receiptInvoiceId}
                onInitialInvoiceConsumed={() => setReceiptInvoiceId(null)}
              />
            ) : (
              <LockedPanel label="Receipts" />
