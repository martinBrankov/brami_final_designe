import type { PromoCodeRecord, MerchantOrderSummary } from "@/lib/promo-codes";

function formatEur(value: number) {
  return `€${value.toFixed(2)}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("bg-BG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function AccountMerchantSection({
  codes,
  orders,
  personalDiscountPercent,
}: {
  codes: PromoCodeRecord[];
  orders: MerchantOrderSummary[];
  personalDiscountPercent: number;
}) {
  const totalCommission = orders.reduce(
    (sum, order) => sum + order.promoCommissionAmount,
    0,
  );
  const paidCommission = orders
    .filter((order) => order.promoCommissionPaidAt)
    .reduce((sum, order) => sum + order.promoCommissionAmount, 0);
  const unpaidCommission = totalCommission - paidCommission;

  return (
    <section className="w-full">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f72a7]">
        Търговец
      </p>
      <h2 className="mt-2 font-serif text-3xl text-[#432855]">
        Профил на търговец
      </h2>
      <p className="mt-2 text-sm text-[#6b587f]">
        Тук виждаш своята лична отстъпка, промо кодове и поръчки, направени през тях.
      </p>

      <div className="mt-6 flex flex-col gap-4 rounded-[18px] border border-[#e6dcef] bg-[linear-gradient(140deg,#faf4fc_0%,#f4eef6_100%)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
            Лична отстъпка
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-[-0.02em] text-[#432855]">
            {personalDiscountPercent}%
          </p>
          <p className="mt-1 text-xs text-[#6b587f]">
            Прилага се автоматично върху продуктите при всяка твоя поръчка.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white">
          {personalDiscountPercent > 0
            ? `−${personalDiscountPercent}% търговец`
            : "Без лична отстъпка"}
        </span>
      </div>

      <h3 className="mt-12 font-serif text-2xl text-[#432855]">
        Моите промо кодове
      </h3>
      <p className="mt-1 text-sm text-[#6b587f]">
        Споделяй кодовете с клиенти. Те получават отстъпка, а ти — комисиона върху всяка поръчка.
      </p>

      {codes.length === 0 ? (
        <p className="mt-6 rounded-[18px] border border-[#ece3f2] bg-[#faf7fc] px-4 py-4 text-sm text-[#6b587f]">
          Все още нямаш активни промо кодове. Свържи се с администратора, за да ти бъде създаден код.
        </p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {codes.map((code) => (
            <li
              key={code.id}
              className="rounded-[18px] border border-[#e6dcef] bg-white p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-lg font-semibold tracking-[0.08em] text-[#432855]">
                  {code.code}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                    code.isActive
                      ? "bg-[#f3faf4] text-[#2e6b3a]"
                      : "bg-[#fff6f6] text-[#9a3f3f]"
                  }`}
                >
                  {code.isActive ? "Активен" : "Неактивен"}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-[#8f72a7]">Отстъпка за купувача</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-[#432855]">
                    {code.discountPercent}%
                  </dd>
                </div>
                <div>
                  <dt className="text-[#8f72a7]">Твоя комисиона</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-[#432855]">
                    {code.commissionPercent}%
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-12">
        <h3 className="font-serif text-2xl text-[#432855]">
          Поръчки през твоите кодове
        </h3>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[18px] border border-[#ece3f2] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8f72a7]">
              Натрупана общо
            </p>
            <p className="mt-1 text-xl font-semibold text-[#432855]">
              {formatEur(totalCommission)}
            </p>
          </div>
          <div className="rounded-[18px] border border-[#cce4d3] bg-[#f3faf4] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2e6b3a]">
              Изплатена
            </p>
            <p className="mt-1 text-xl font-semibold text-[#2e6b3a]">
              {formatEur(paidCommission)}
            </p>
          </div>
          <div className="rounded-[18px] border border-[#e8c7c7] bg-[#fff6f6] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#9a3f3f]">
              Очаква изплащане
            </p>
            <p className="mt-1 text-xl font-semibold text-[#9a3f3f]">
              {formatEur(unpaidCommission)}
            </p>
          </div>
        </div>

        {orders.length === 0 ? (
          <p className="mt-4 rounded-[18px] border border-[#ece3f2] bg-[#faf7fc] px-4 py-4 text-sm text-[#6b587f]">
            Все още няма направени поръчки през твоите промо кодове.
          </p>
        ) : (
          <>
            <ul className="mt-4 space-y-3 lg:hidden">
              {orders.map((order) => {
                const isPaid = Boolean(order.promoCommissionPaidAt);
                return (
                  <li
                    key={order.id}
                    className="rounded-[18px] border border-[#ece3f2] bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-semibold text-[#432855]">
                          #{order.orderNumber}
                        </p>
                        <p className="text-[11px] text-[#6b587f]">
                          {formatDate(order.orderCreatedAt || order.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                          isPaid
                            ? "bg-[#f3faf4] text-[#2e6b3a]"
                            : "bg-[#fff6f6] text-[#9a3f3f]"
                        }`}
                      >
                        {isPaid ? "Изплатена" : "Очаква изплащане"}
                      </span>
                    </div>

                    <div className="mt-3 text-sm">
                      <p className="truncate font-medium text-[#432855]">
                        {order.customerFullName}
                      </p>
                      <p className="truncate text-xs text-[#8f72a7]">
                        {order.customerEmail}
                      </p>
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                      <div>
                        <dt className="text-[10px] uppercase tracking-[0.08em] text-[#8f72a7]">
                          Код
                        </dt>
                        <dd className="mt-0.5 font-mono text-sm text-[#432855]">
                          {order.promoCodeText}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-[0.08em] text-[#8f72a7]">
                          Стойност
                        </dt>
                        <dd className="mt-0.5 text-sm font-medium text-[#432855]">
                          {formatEur(order.total)}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#ece3f2] pt-3">
                      <span className="text-[11px] uppercase tracking-[0.08em] text-[#8f72a7]">
                        {isPaid
                          ? `Изплатена на ${formatDate(order.promoCommissionPaidAt!)}`
                          : "Комисиона"}
                      </span>
                      <span
                        className={`text-base font-semibold ${
                          isPaid ? "text-[#6b587f]" : "text-[#2e6b3a]"
                        }`}
                      >
                        {isPaid ? "" : "+"}
                        {formatEur(order.promoCommissionAmount)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 hidden lg:block">
              <table className="w-full text-sm">
                <thead className="border-b border-[#ece3f2] text-left text-xs uppercase tracking-[0.08em] text-[#8f72a7]">
                  <tr>
                    <th className="py-2 pr-3 font-semibold">Поръчка</th>
                    <th className="py-2 pr-3 font-semibold">Дата</th>
                    <th className="py-2 pr-3 font-semibold">Клиент</th>
                    <th className="py-2 pr-3 font-semibold">Код</th>
                    <th className="py-2 pr-3 text-right font-semibold">Стойност</th>
                    <th className="py-2 pr-3 text-right font-semibold">Комисиона</th>
                    <th className="py-2 pl-3 font-semibold">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ece3f2]">
                  {orders.map((order) => {
                    const isPaid = Boolean(order.promoCommissionPaidAt);
                    return (
                      <tr key={order.id} className="text-[#432855]">
                        <td className="py-3 pr-3 font-mono text-xs">
                          #{order.orderNumber}
                        </td>
                        <td className="py-3 pr-3 text-xs text-[#6b587f]">
                          {formatDate(order.orderCreatedAt || order.createdAt)}
                        </td>
                        <td className="py-3 pr-3">
                          <span className="block text-sm font-medium">
                            {order.customerFullName}
                          </span>
                          <span className="block text-xs text-[#8f72a7]">
                            {order.customerEmail}
                          </span>
                        </td>
                        <td className="py-3 pr-3 font-mono text-xs">
                          {order.promoCodeText}
                        </td>
                        <td className="py-3 pr-3 text-right font-medium">
                          {formatEur(order.total)}
                        </td>
                        <td
                          className={`py-3 pr-3 text-right font-semibold ${
                            isPaid ? "text-[#6b587f]" : "text-[#2e6b3a]"
                          }`}
                        >
                          {isPaid ? "" : "+"}
                          {formatEur(order.promoCommissionAmount)}
                        </td>
                        <td className="py-3 pl-3">
                          {isPaid ? (
                            <span className="inline-flex items-center rounded-full bg-[#f3faf4] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#2e6b3a]">
                              Изплатена · {formatDate(order.promoCommissionPaidAt!)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-[#fff6f6] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9a3f3f]">
                              Очаква изплащане
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
