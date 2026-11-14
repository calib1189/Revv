export default function AdminSalesLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <div className="mb-6 h-9 w-28 animate-pulse rounded-lg bg-surface" />
      <div className="mb-8 grid grid-cols-3 gap-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[74px] animate-pulse rounded-[18px] bg-surface" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-[22px] bg-surface" />
    </div>
  );
}
