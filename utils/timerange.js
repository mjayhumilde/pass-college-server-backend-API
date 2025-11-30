exports.getDateRange = (range) => {
  const now = new Date();
  let start;

  switch (range) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;

    case "week":
      const firstDayOfWeek = now.getDate() - now.getDay(); // Sunday-based
      start = new Date(now.getFullYear(), now.getMonth(), firstDayOfWeek);
      break;

    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;

    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      break;

    default:
      throw new Error("Invalid range");
  }

  return { start, end: now };
};
