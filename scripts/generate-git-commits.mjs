/* ---------------------------------------------------------------------------
 * Generates src/data/git-commits.json from the local git history.
 * Runs in CI (.github/workflows/deploy.yml) right before `next build`, so the
 * landing page commit feed always matches the commit that is being deployed.
 * No dependencies: git log -> delimited records -> JSON.
 * ------------------------------------------------------------------------- */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const COMMIT_COUNT = Number(process.env.COMMIT_COUNT || 6);
const RECORD_SEP = "\x1e";
const FIELD_SEP = "\x1f";
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const KNOWN_TYPES = new Set([
  "feat", "fix", "style", "refactor", "docs", "test",
  "perf", "build", "ci", "chore", "revert",
]);

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = join(repoRoot, "src", "data", "git-commits.json");

function runGit(args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
}

/** "Oct 30, 2026" from git's short date (commit local time, no host TZ drift). */
function formatCommitDate(shortDate) {
  const [year, month, day] = shortDate.split("-").map(Number);
  if (!year || !month || !day) return shortDate;
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

/**
 * Splits a conventional commit subject into the badge type and the readable
 * description, e.g. "feat(categories): add CRUD" -> { tag: "feat", message: "add CRUD" }.
 * Subjects without a known type keep their original text untouched.
 */
function parseSubject(subject) {
  const match = /^([a-z]+)(\([^)]*\))?!?:\s*(.*)$/i.exec(subject);
  if (!match) return { tag: "chore", message: subject };
  const type = match[1].toLowerCase();
  if (!KNOWN_TYPES.has(type)) return { tag: "chore", message: subject };
  return { tag: type, message: match[3].trim() || subject };
}

function resolveBranch() {
  const fromEnv = (process.env.GIT_BRANCH || "").trim();
  if (fromEnv) return fromEnv.replace(/^origin\//, "");
  try {
    const head = runGit(["rev-parse", "--abbrev-ref", "HEAD"]).trim();
    return head && head !== "HEAD" ? head : "main";
  } catch {
    return "main";
  }
}

function collectCommits() {
  const output = runGit([
    "log",
    `-${COMMIT_COUNT}`,
    "--date=short",
    `--pretty=format:${RECORD_SEP}%h${FIELD_SEP}%cd${FIELD_SEP}%an${FIELD_SEP}%s`,
  ]);

  return output
    .split(RECORD_SEP)
    .map((record) => record.replace(/^\n/, "").trim())
    .filter(Boolean)
    .map((record) => {
      const [hash, shortDate, author, subject] = record.split(FIELD_SEP);
      const { tag, message } = parseSubject(subject);
      return {
        hash,
        date: formatCommitDate(shortDate),
        tag,
        message,
        author,
      };
    });
}

function writePayload(payload) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

/**
 * Repository level metrics shown on the landing page summary strip.
 * All values are read from git, never hardcoded.
 */
function collectStats(commits) {
  const totalCommits = Number(runGit(["rev-list", "--count", "HEAD"]).trim() || 0);

  const contributors = runGit(["shortlog", "-sn", "HEAD"])
    .split("\n")
    .map((line) => /^\s*(\d+)\t(.+)$/.exec(line))
    .filter(Boolean)
    .map((match) => ({ name: match[2].trim(), commitCount: Number(match[1]) }));

  const firstCommitDate = formatCommitDate(
    runGit(["log", "--reverse", "--max-count=1", "--date=short", "--pretty=format:%cd"]).trim(),
  );

  return {
    totalCommits,
    contributors,
    firstCommitDate,
    latestHash: commits[0]?.hash ?? "",
    latestDate: commits[0]?.date ?? "",
  };
}

try {
  const commits = collectCommits();
  const payload = {
    branch: `origin/${resolveBranch()}`,
    generatedAt: new Date().toISOString(),
    stats: collectStats(commits),
    commits,
  };
  writePayload(payload);
  console.log(
    `git-commits.json written: ${payload.commits.length} commits, ${payload.stats.totalCommits} total (${payload.branch}).`,
  );
} catch (error) {
  // Keep whatever is already committed so the build never breaks on a host
  // where git history is unavailable (e.g. source archive without .git).
  if (existsSync(outputPath)) {
    console.warn(`git history unavailable, keeping existing git-commits.json: ${error.message}`);
    process.exit(0);
  }
  const emptyStats = {
    totalCommits: 0,
    contributors: [],
    firstCommitDate: "",
    latestHash: "",
    latestDate: "",
  };
  writePayload({ branch: "origin/main", generatedAt: new Date().toISOString(), stats: emptyStats, commits: [] });
  console.warn(`git history unavailable, wrote empty git-commits.json: ${error.message}`);
}
