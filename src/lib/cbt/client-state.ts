type VersionedView = {
  version: number;
  status: "active" | "submitted";
  released: boolean;
  server_time: string;
};
export function shouldAcceptCbtView(
  current: VersionedView,
  next: VersionedView,
) {
  if (next.version < current.version) return false;
  if (current.status === "submitted" && next.status !== "submitted")
    return false;
  if (current.released && !next.released) return false;
  return (
    next.version > current.version ||
    Date.parse(next.server_time) >= Date.parse(current.server_time)
  );
}
