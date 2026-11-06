import React, { useState } from 'react';

export const PAGE_SIZE = 10;

const pageNumbers = (page, totalPages) => {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push('gap');
    result.push(p);
  });
  return result;
};

// Remount with a new `key` (e.g. the filtered ids) to reset back to page 1.
export const PaginatedList = ({ items, renderPage }) => {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageItems = items.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const goTo = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const btn = 'min-w-[2.5rem] px-3 py-2 text-sm font-bold rounded-lg border transition';

  return (
    <>
      {renderPage(pageItems)}
      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-2 mt-8">
          <button
            onClick={() => goTo(current - 1)}
            disabled={current === 1}
            className={`${btn} border-gray-200 text-gray-600 hover:border-green-600 hover:text-green-600 disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-600`}
          >
            Previous
          </button>
          {pageNumbers(current, totalPages).map((p, i) => p === 'gap' ? (
            <span key={`gap-${i}`} className="px-1 text-gray-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => goTo(p)}
              aria-current={p === current ? 'page' : undefined}
              className={`${btn} ${p === current ? 'bg-green-600 border-green-600 text-white' : 'border-gray-200 text-gray-600 hover:border-green-600 hover:text-green-600'}`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => goTo(current + 1)}
            disabled={current === totalPages}
            className={`${btn} border-gray-200 text-gray-600 hover:border-green-600 hover:text-green-600 disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-600`}
          >
            Next
          </button>
        </nav>
      )}
    </>
  );
};
