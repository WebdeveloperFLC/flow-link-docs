import { useEffect, useState } from "react";
import { AgGridReact, AgGridReactProps } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz, colorSchemeDarkBlue } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

const lightTheme = themeQuartz.withParams({
  backgroundColor: "hsl(var(--card))",
  foregroundColor: "hsl(var(--foreground))",
  headerBackgroundColor: "hsl(var(--muted))",
  headerTextColor: "hsl(var(--muted-foreground))",
  borderColor: "hsl(var(--border))",
  rowHoverColor: "hsl(var(--accent) / 0.6)",
  selectedRowBackgroundColor: "hsl(var(--accent))",
  oddRowBackgroundColor: "transparent",
  fontFamily: "inherit",
  fontSize: 13,
  headerFontWeight: 600,
  rowBorder: { style: "solid", width: 1, color: "hsl(var(--border))" },
  wrapperBorder: { style: "solid", width: 1, color: "hsl(var(--border))" },
  borderRadius: 8,
});

const darkTheme = lightTheme.withPart(colorSchemeDarkBlue).withParams({
  backgroundColor: "hsl(var(--card))",
  foregroundColor: "hsl(var(--foreground))",
  headerBackgroundColor: "hsl(var(--muted))",
  headerTextColor: "hsl(var(--muted-foreground))",
  borderColor: "hsl(var(--border))",
  rowHoverColor: "hsl(var(--accent) / 0.6)",
});

function useDarkMode() {
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );
  useEffect(() => {
    if (typeof document === "undefined") return;
    const mo = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains("dark"));
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  return dark;
}

interface Props<T> extends AgGridReactProps<T> {
  height?: number | string;
}

const popupParent = typeof document !== "undefined" ? document.body : undefined;

export default function AccountingAGGrid<T>({ height = 480, ...props }: Props<T>) {
  const dark = useDarkMode();
  const theme = dark ? darkTheme : lightTheme;
  return (
    <div style={{ height, width: "100%" }}>
      <AgGridReact<T>
        key={dark ? "ag-dark" : "ag-light"}
        theme={theme}
        popupParent={popupParent}
        defaultColDef={{
          sortable: true,
          resizable: true,
          filter: true,
          minWidth: 100,
          ...props.defaultColDef,
        }}
        animateRows={false}
        rowHeight={40}
        headerHeight={40}
        suppressCellFocus
        {...props}
      />
    </div>
  );
}