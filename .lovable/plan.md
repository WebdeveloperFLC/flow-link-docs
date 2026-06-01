I’ll tighten the counselor Service Library so the Category-first UI cannot still appear there.

Plan:
1. Confirm the route/page rendering the user sees is the counselor Service Library route, not the Admin route.
2. Update `src/pages/ServiceLibrary.tsx` only:
   - remove unused Category/search/sidebar imports and helper constants from the counselor page;
   - keep only the Country → Service → Sub-service selectors;
   - ensure no Category label is displayed in the selected record header;
   - keep Category only internally for link generation/metadata;
   - keep details hidden until all three selections are complete.
3. Preserve the admin page category tree because the requirement allowed Category to remain in admin.
4. Validate by checking the counselor page code has no visible Category-first browsing/sidebar/search UI left.