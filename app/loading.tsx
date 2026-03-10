export default function AppLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50">
      <div className="flex items-center gap-3 rounded-xl border bg-card px-5 py-3 shadow-sm">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Cargando vista...</span>
      </div>
    </div>
  );
}
