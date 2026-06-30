/** Clear boot-time inline styles on #root so full-width app layouts render correctly. */
export function resetAppRootLayout(): void {
  const root = document.getElementById("root");
  if (!root) return;
  root.style.minHeight = "100vh";
  root.style.width = "100%";
  root.style.maxWidth = "";
  root.style.margin = "";
  root.style.padding = "0";
  root.style.display = "block";
  root.style.alignItems = "";
  root.style.justifyContent = "";
  root.style.background = "";
  root.style.color = "";
  root.style.fontFamily = "";
  root.style.textAlign = "";
  root.style.boxSizing = "border-box";
}
