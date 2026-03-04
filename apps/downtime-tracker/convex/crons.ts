import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "check competitor statuses",
  { minutes: 5 },
  internal.statusCheck.checkAll
);

export default crons;
