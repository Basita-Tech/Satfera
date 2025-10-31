// useTodayDate.js
import { useState, useEffect } from "react";

export const useTodayDate = () => {
  const [today, setToday] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setToday(new Date());
    }, 60 * 1000); // update every 1 min

    return () => clearInterval(timer);
  }, []);

  return today;
};
