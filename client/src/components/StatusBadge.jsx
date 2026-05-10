const LABELS = {
  placed: 'Placed',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready for pickup',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold status-${status}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current pulse-dot" />
      {LABELS[status] || status}
    </span>
  );
}
