import { execFileSync } from "node:child_process";

const options = { cwd: process.cwd(), stdio: "inherit" };
execFileSync("pnpm", ["check"], options);
execFileSync("pnpm", ["test"], options);
console.log("\nValidação do MVP concluída: tipos, regras comerciais e anexos de agosto foram verificados.");
