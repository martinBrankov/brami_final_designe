"use client";

import { useEffect, useState, type FormEvent } from "react";

import type { Comment } from "@/data/products";

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
  comments: Comment[];
};

const DESCRIPTION_LABEL = "Описание";
const REVIEWS_LABEL = "Отзиви";
const NO_REVIEWS_LABEL = "Все още няма добавени оценки за този продукт.";
const RATED_PRODUCTS_STORAGE_KEY = "rated-products";

export function ProductDetailTabs({
  productId,
  productName,
  description,
  comments,
}: ProductDetailTabsProps) {
  const [reviewItems, setReviewItems] = useState(comments);
  const [activeTab, setActiveTab] = useState<"description" | "reviews">(
    "description",
  );
  const [name, setName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [rating, setRating] = useState(5);
  const [error, setError] = useState("");
  const [ratingSuccess, setRatingSuccess] = useState("");
  const [isRatingFormOpen, setIsRatingFormOpen] = useState(false);
  const [isCommentFormOpen, setIsCommentFormOpen] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [currentUserRating, setCurrentUserRating] = useState<number | null>(
    null,
  );
  const [showRatingConfirmation, setShowRatingConfirmation] = useState(false);
  const nameLength = name.length;
  const commentLength = commentText.length;

  useEffect(() => {
    const storedValue = window.localStorage.getItem(RATED_PRODUCTS_STORAGE_KEY);

    if (!storedValue) {
      return;
    }

    try {
      const ratedProducts = JSON.parse(storedValue) as Record<
        string,
        boolean | number
      >;
      const storedRating = ratedProducts[String(productId)];

      if (typeof storedRating === "number" && storedRating >= 1) {
        setHasRated(true);
        setCurrentUserRating(storedRating);
        return;
      }

      if (storedRating) {
        setHasRated(true);
        setCurrentUserRating(5);
      }
    } catch {
      window.localStorage.removeItem(RATED_PRODUCTS_STORAGE_KEY);
    }
  }, [productId]);

  function handleRatingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const storedValue = window.localStorage.getItem(RATED_PRODUCTS_STORAGE_KEY);
    let ratedProducts: Record<string, boolean | number> = {};

    if (storedValue) {
      try {
        ratedProducts = JSON.parse(storedValue) as Record<
          string,
          boolean | number
        >;
      } catch {
        ratedProducts = {};
      }
    }

    ratedProducts[String(productId)] = rating;
    window.localStorage.setItem(
      RATED_PRODUCTS_STORAGE_KEY,
      JSON.stringify(ratedProducts),
    );

    setHasRated(true);
    setCurrentUserRating(rating);
    setShowRatingConfirmation(true);
    setIsRatingFormOpen(false);
    setRating(5);
    setError("");
    setRatingSuccess("Оценката е изпратена.");
  }

  function handleCommentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedComment = commentText.trim();

    if (!trimmedName) {
      setError("Името е задължително.");
      return;
    }

    setReviewItems((current) => [
      {
        name: trimmedName,
        comment:
          trimmedComment ||
          "Потвърдена оценка без текстов коментар.",
        rating: currentUserRating ?? 0,
        data: "Току-що",
      },
      ...current,
    ]);
    setName("");
    setCommentText("");
    setError("");
    setRatingSuccess("");
    setIsCommentFormOpen(false);
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

      <div className="px-6 py-8 sm:px-10 lg:px-14">
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
            {showRatingConfirmation ? (
              <section className="-mx-6 border-y border-[#d9eadc] bg-[#f4fbf5] px-6 py-5 sm:-mx-10 sm:px-10 lg:-mx-14 lg:px-14">
                <p className="text-sm font-medium text-[#4f875d]">
                  {ratingSuccess}
                </p>
              </section>
            ) : hasRated ? null : (
              <section className="-mx-6 border-t border-b border-[#e4dbea] bg-[#fbf8ff] sm:-mx-10 lg:-mx-14">
                <button
                  type="button"
                  onClick={() => {
                    setIsRatingFormOpen((current) => !current);
                    setError("");
                  }}
                  className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left sm:px-10 lg:px-14"
                >
                  <div>
                    <h3 className="text-base font-semibold text-[#432855]">
                      {"Добави оценка"}
                    </h3>
                    <p className="mt-1 text-sm text-[#6b587f]">
                      {"Избери брой звезди и изпрати оценка."}
                    </p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d8d0de] bg-white text-[#432855]">
                    <ChevronIcon open={isRatingFormOpen} />
                  </span>
                </button>

                {isRatingFormOpen ? (
                  <form
                    onSubmit={handleRatingSubmit}
                    className="border-t border-[#e4dbea] px-6 pb-5 pt-4 sm:px-10 lg:px-14"
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
                              setRatingSuccess("");
                            }}
                            className="h-4 w-4 accent-[#6c3f8d] focus:ring-[#cbb7d8]"
                          />
                          <div className="flex items-center gap-0 text-[#c5a76c]">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <svg
                                key={index}
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                className={`h-5 w-5 ${
                                  index < value ? "fill-current" : "fill-[#eadfcb]"
                                }`}
                              >
                                <path d="m12 3.6 2.55 5.17 5.71.83-4.13 4.02.98 5.68L12 16.62 6.89 19.3l.98-5.68-4.13-4.02 5.71-.83Z" />
                              </svg>
                            ))}
                          </div>
                        </label>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="submit"
                        className="inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-5 text-sm font-semibold uppercase tracking-[0.06em] text-white"
                      >
                        {"Оцени"}
                      </button>
                    </div>

                    {error ? (
                      <p className="mt-3 text-sm text-[#b04f68]">{error}</p>
                    ) : null}
                  </form>
                ) : null}
              </section>
            )}

            <section className="-mx-6 border-b border-[#e4dbea] bg-[#fbf8ff] sm:-mx-10 lg:-mx-14">
              <button
                type="button"
                onClick={() => {
                  setIsCommentFormOpen((current) => !current);
                  setError("");
                }}
                className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left sm:px-10 lg:px-14"
              >
                <div>
                  <h3 className="text-base font-semibold text-[#432855]">
                    {"Добави коментар"}
                  </h3>
                  <p className="mt-1 text-sm text-[#6b587f]">
                    {"Сподели опита си за продукта и добави оценка със звездички."}
                  </p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d8d0de] bg-white text-[#432855]">
                  <ChevronIcon open={isCommentFormOpen} />
                </span>
              </button>

              {isCommentFormOpen ? (
                <form
                  onSubmit={handleCommentSubmit}
                  className="border-t border-[#e4dbea] px-6 pb-5 pt-4 sm:px-10 lg:px-14"
                >
                  <div className="grid gap-4">
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
                  </div>
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

                  {error ? (
                    <p className="mt-3 text-sm text-[#b04f68]">{error}</p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      className="inline-flex h-11 items-center justify-center rounded-full bg-[linear-gradient(100deg,#9f79ac_0%,#432855_100%)] px-5 text-sm font-semibold uppercase tracking-[0.06em] text-white"
                    >
                      {"Изпрати коментара"}
                    </button>
                  </div>
                </form>
              ) : null}
            </section>

            {reviewItems.length ? (
              <div className="pt-4">
                {reviewItems.map((comment, index) => (
                <article
                  key={`${comment.name}-${comment.data}-${index}`}
                  className="border-b border-[#e4dbea] pb-4 last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-[#432855]">{comment.name}</p>
                    <p className="text-sm text-[#8f72a7]">{comment.data}</p>
                  </div>
                  {comment.rating > 0 ? (
                    <div className="mt-2">
                      <StarRow rating={comment.rating} />
                    </div>
                  ) : null}
                  <p className="mt-3 text-[#5f4b73]">{comment.comment}</p>
                </article>
                ))}
              </div>
            ) : (
              <p className="text-[#6b587f]">{NO_REVIEWS_LABEL}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
