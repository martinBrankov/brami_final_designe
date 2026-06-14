"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type DisplayReview = {
  id: string;
  kind: "review" | "comment";
  name: string;
  comment: string;
  rating: number;
  data: string;
};

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0 text-[#c5a76c]">
      {Array.from({ length: 5 }).map((_, index) => (
        <svg
          key={index}
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`h-5 w-5 ${
            index < rating ? "fill-current" : "fill-[#eadfcb]"
          }`}
        >
          <path d="m12 3.6 2.55 5.17 5.71.83-4.13 4.02.98 5.68L12 16.62 6.89 19.3l.98-5.68-4.13-4.02 5.71-.83Z" />
        </svg>
      ))}
    </div>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
      <path d="M9 7V4h6v3" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 7.5 5 5 5-5" />
    </svg>
  );
}

type ProductDetailTabsProps = {
  productId: number;
  productName: string;
  description: string;
  reviews: DisplayReview[];
  isAuthenticated: boolean;
  isAdmin?: boolean;
  userName?: string;
  initialUserReview: { rating: number; comment: string } | null;
};

const DESCRIPTION_LABEL = "Описание";
const REVIEWS_LABEL = "Отзиви";
const NO_REVIEWS_LABEL = "Все още няма добавени оценки за този продукт.";

export function ProductDetailTabs({
  productId,
  productName,
  description,
  reviews,
  isAuthenticated,
  isAdmin = false,
  userName = "",
  initialUserReview,
}: ProductDetailTabsProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"description" | "reviews">(
    "description",
  );

  const [hasRated, setHasRated] = useState(
    Boolean(initialUserReview && initialUserReview.rating >= 1),
  );
  const [hasCommented, setHasCommented] = useState(
    Boolean(initialUserReview && initialUserReview.comment.trim()),
  );
  const [userRating, setUserRating] = useState(initialUserReview?.rating ?? 0);

  // Rating form
  const [rating, setRating] = useState(5);
  const [isRatingFormOpen, setIsRatingFormOpen] = useState(false);
  const [ratingError, setRatingError] = useState("");
  const [ratingSuccess, setRatingSuccess] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  // Comment form
  const [name, setName] = useState(userName);
  const [commentText, setCommentText] = useState("");
  const [isCommentFormOpen, setIsCommentFormOpen] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const nameLength = name.length;
  const commentLength = commentText.length;

  async function submitReview(
    nextRating: number,
    nextComment: string,
    nextName?: string,
  ) {
    const response = await fetch(`/api/products/${productId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating: nextRating,
        comment: nextComment,
        name: nextName,
      }),
    });

    const result = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;

    if (!response.ok || !result?.ok) {
      throw new Error(result?.error || "Неуспешно записване.");
    }
  }

  async function handleRatingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRatingError("");

    if (rating < 1) {
      setRatingError("Избери брой звезди.");
      return;
    }

    setIsSubmittingRating(true);

    try {
      // Rating only — keeps the comment empty, so it counts toward the average
      // but is not shown in the comment list.
      await submitReview(rating, "");
      setUserRating(rating);
      setHasRated(true);
      setIsRatingFormOpen(false);
      setRatingSuccess("Оценката е изпратена.");
      router.refresh();
    } catch (error) {
      setRatingError(
        error instanceof Error ? error.message : "Възникна грешка.",
      );
    } finally {
      setIsSubmittingRating(false);
    }
  }

  async function handleCommentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCommentError("");

    const trimmedComment = commentText.trim();
    // Empty name -> the comment is shown as "Анонимен потребител".
    const authorName = name.trim() || "Анонимен потребител";

    if (!trimmedComment) {
      setCommentError("Напиши коментар, преди да го изпратиш.");
      return;
    }

    if (userRating < 1) {
      setCommentError("Първо добави оценка на продукта.");
      return;
    }

    setIsSubmittingComment(true);

    try {
      await submitReview(userRating, trimmedComment, authorName);
      setHasCommented(true);
      setIsCommentFormOpen(false);
      setCommentText("");
      router.refresh();
    } catch (error) {
      setCommentError(
        error instanceof Error ? error.message : "Възникна грешка.",
      );
    } finally {
      setIsSubmittingComment(false);
    }
  }

  async function handleDelete(review: DisplayReview) {
    if (!window.confirm("Сигурен ли си, че искаш да изтриеш този коментар?")) {
      return;
    }

    setDeletingId(review.id);

    try {
      const response = await fetch(`/api/products/${productId}/reviews`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: review.kind, id: review.id }),
      });

      if (response.ok) {
        router.refresh();
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="w-full border-b border-[#d8d0de] bg-white">
      <div className="w-full border-b border-[#e4dbea] bg-[#FBF8FF]">
        <div className="flex flex-wrap gap-3 px-6 py-4 sm:px-10 lg:px-14">
          <button
            type="button"
            onClick={() => setActiveTab("description")}
            className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold uppercase tracking-[0.06em] transition ${
              activeTab === "description"
                ? "bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] text-white"
                : "border border-[#d8d0de] bg-white text-[#432855] hover:bg-[#faf7fc]"
            }`}
          >
            {DESCRIPTION_LABEL}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reviews")}
            className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold uppercase tracking-[0.06em] transition ${
              activeTab === "reviews"
                ? "bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] text-white"
                : "border border-[#d8d0de] bg-white text-[#432855] hover:bg-[#faf7fc]"
            }`}
          >
            {REVIEWS_LABEL}
          </button>
        </div>
      </div>

      <div
        className={`px-6 sm:px-10 lg:px-14 ${
          activeTab === "description" ? "py-8" : "pb-8 pt-0"
        }`}
      >
        {activeTab === "description" ? (
          <div className="space-y-5">
            <h2 className="font-serif text-[1.9rem] leading-tight text-[#432855] sm:text-[2.2rem]">
              {productName}
            </h2>
            <div
              className="text-[#5f4b73]"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          </div>
        ) : (
          <div className="space-y-0">
            {!isAuthenticated ? (
              <section className="-mx-6 border-b border-[#e4dbea] bg-[#fbf8ff] px-6 py-5 sm:-mx-10 sm:px-10 lg:-mx-14 lg:px-14">
                <h3 className="text-base font-semibold text-[#432855]">
                  Оцени продукта
                </h3>
                <p className="mt-1 text-sm text-[#6b587f]">
                  Влез в профила си, за да оставиш оценка и коментар.
                </p>
                <Link
                  href="/account"
                  className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-6 text-sm font-semibold uppercase tracking-[0.06em] text-white"
                >
                  Вход / Регистрация
                </Link>
              </section>
            ) : (
              <>
                {ratingSuccess && !hasCommented ? (
                  <section className="-mx-6 border-y border-[#d9eadc] bg-[#f4fbf5] px-6 py-5 sm:-mx-10 sm:px-10 lg:-mx-14 lg:px-14">
                    <p className="text-sm font-medium text-[#4f875d]">
                      {ratingSuccess}
                    </p>
                  </section>
                ) : null}

                {/* Rating form — hidden once the user has rated this product. */}
                {!hasRated ? (
                  <section className="-mx-6 border-b border-[#e4dbea] bg-[#fbf8ff] sm:-mx-10 lg:-mx-14">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRatingFormOpen((current) => !current);
                        setRatingError("");
                      }}
                      className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left sm:px-10 lg:px-14"
                    >
                      <div>
                        <h3 className="text-base font-semibold text-[#432855]">
                          Добави оценка
                        </h3>
                        <p className="mt-1 text-sm text-[#6b587f]">
                          Избери брой звезди и изпрати оценка.
                        </p>
                      </div>
                      <span className="flex h-10 w-10 shrink-0 aspect-square items-center justify-center rounded-full border border-[#d8d0de] bg-white text-[#432855]">
                        <ChevronIcon open={isRatingFormOpen} />
                      </span>
                    </button>

                    {isRatingFormOpen ? (
                      <form
                        onSubmit={handleRatingSubmit}
                        className="border-t border-[#e4dbea] bg-[#fdfdfd] px-6 pb-5 pt-4 sm:px-10 lg:px-14"
                      >
                        <div className="space-y-0.5">
                          {[5, 4, 3, 2, 1].map((value) => (
                            <label
                              key={value}
                              className="flex items-center gap-2 px-0 py-0.5"
                            >
                              <input
                                type="radio"
                                name="rating"
                                checked={rating === value}
                                onChange={() => {
                                  setRating(value);
                                  setRatingError("");
                                }}
                                className="h-4 w-4 accent-[#6c3f8d] focus:ring-[#cbb7d8]"
                              />
                              <StarRow rating={value} />
                            </label>
                          ))}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="submit"
                            disabled={isSubmittingRating}
                            className="inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-5 text-sm font-semibold uppercase tracking-[0.06em] text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSubmittingRating ? "Изпращане..." : "Оцени"}
                          </button>
                        </div>

                        {ratingError ? (
                          <p className="mt-3 text-sm text-[#b04f68]">{ratingError}</p>
                        ) : null}
                      </form>
                    ) : null}
                  </section>
                ) : null}

                {/* Comment form — visible until the user leaves a comment. */}
                {!hasCommented ? (
                  <section className="-mx-6 border-b border-[#e4dbea] bg-[#fbf8ff] sm:-mx-10 lg:-mx-14">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCommentFormOpen((current) => !current);
                        setCommentError("");
                      }}
                      className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left sm:px-10 lg:px-14"
                    >
                      <div>
                        <h3 className="text-base font-semibold text-[#432855]">
                          Добави коментар
                        </h3>
                        <p className="mt-1 text-sm text-[#6b587f]">
                          Сподели опита си за продукта и добави оценка със звездички.
                        </p>
                      </div>
                      <span className="flex h-10 w-10 shrink-0 aspect-square items-center justify-center rounded-full border border-[#d8d0de] bg-white text-[#432855]">
                        <ChevronIcon open={isCommentFormOpen} />
                      </span>
                    </button>

                    {isCommentFormOpen ? (
                      <form
                        onSubmit={handleCommentSubmit}
                        className="border-t border-[#e4dbea] bg-[#fdfdfd] px-6 pb-5 pt-4 sm:px-10 lg:px-14"
                      >
                        <label className="flex flex-col gap-2">
                          <span className="flex items-center justify-between gap-4">
                            <span className="text-sm font-medium text-[#432855]">
                              Име
                            </span>
                            <span className="text-xs font-medium text-[#8f72a7]">
                              {nameLength}/50
                            </span>
                          </span>
                          <input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            maxLength={50}
                            className="h-11 rounded-full border border-[#d8d0de] bg-white px-4 text-[#432855] outline-none transition focus:border-[#8f72a7]"
                            placeholder="Въведи име"
                          />
                        </label>
                        <label className="mt-4 flex flex-col gap-2">
                          <span className="flex items-center justify-between gap-4">
                            <span className="text-sm font-medium text-[#432855]">
                              Отзив
                            </span>
                            <span className="text-xs font-medium text-[#8f72a7]">
                              {commentLength}/1000
                            </span>
                          </span>
                          <textarea
                            value={commentText}
                            onChange={(event) => setCommentText(event.target.value)}
                            rows={4}
                            maxLength={1000}
                            className="rounded-[24px] border border-[#d8d0de] bg-white px-4 py-3 text-[#432855] outline-none transition focus:border-[#8f72a7]"
                            placeholder="Сподели мнението си за продукта"
                          />
                        </label>

                        {commentError ? (
                          <p className="mt-3 text-sm text-[#b04f68]">{commentError}</p>
                        ) : null}

                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="submit"
                            disabled={isSubmittingComment}
                            className="inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-5 text-sm font-semibold uppercase tracking-[0.06em] text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSubmittingComment ? "Изпращане..." : "Изпрати коментара"}
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </section>
                ) : null}

                {hasRated && hasCommented ? (
                  <section className="-mx-6 border-b border-[#e4dbea] bg-[#fbf8ff] px-6 py-5 sm:-mx-10 sm:px-10 lg:-mx-14 lg:px-14">
                    <p className="text-sm font-medium text-[#4f875d]">
                      Благодарим за оценката и коментара!
                    </p>
                  </section>
                ) : null}
              </>
            )}

            {reviews.length ? (
              <div className="pt-4">
                {reviews.map((review, index) => (
                  <article
                    key={`${review.kind}-${review.id}-${index}`}
                    className="border-b border-[#e4dbea] pb-4 last:border-b-0"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-semibold text-[#432855]">{review.name}</p>
                      <div className="flex items-center gap-3">
                        <p className="text-sm text-[#8f72a7]">{review.data}</p>
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(review)}
                            disabled={deletingId === review.id}
                            aria-label="Изтрий коментара"
                            title="Изтрий коментара"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e6c9c9] text-[#b04f68] transition hover:bg-[#fdf1f3] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <TrashIcon />
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {review.rating > 0 ? (
                      <div className="mt-2">
                        <StarRow rating={review.rating} />
                      </div>
                    ) : null}
                    <p className="mt-3 text-[#5f4b73]">{review.comment}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="pt-4 text-[#6b587f]">{NO_REVIEWS_LABEL}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
