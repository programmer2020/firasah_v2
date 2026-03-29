import { useState, useMemo } from 'react';

export const usePagination = (items = [], itemsPerPage = 10) => {
  const [currentPage, setCurrentPage] = useState(1);

  const paginationData = useMemo(() => {
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = items.slice(startIndex, endIndex);

    return {
      paginatedItems,
      currentPage,
      totalPages,
      totalItems,
      startIndex,
      itemsPerPage,
    };
  }, [items, currentPage, itemsPerPage]);

  const goToPage = (pageNumber) => {
    const totalPages = Math.ceil(items.length / itemsPerPage);
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const nextPage = () => {
    const totalPages = Math.ceil(items.length / itemsPerPage);
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const reset = () => setCurrentPage(1);

  return {
    ...paginationData,
    goToPage,
    nextPage,
    prevPage,
    reset,
  };
};

export default usePagination;
