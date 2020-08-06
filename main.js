// Ref: -> https://www.conventionalcommits.org/en/v1.0.0/
/** @format */

const child = require("child_process");
const fs = require("fs");
const repoUrl = child.execSync(`git config --get remote.origin.url`).toString('utf-8').trim();
const getGitBranch = child.execSync(`git rev-parse --abbrev-ref HEAD`).toString('utf-8').trim();
const getCurrentReleaseVersion = child.execSync("git describe --tags --abbrev=0").toString('utf-8').trim();

const output = child
  .execSync(`git log --name-status HEAD^..HEAD --format=%B%H----DELIMITER----`)
  .toString("utf-8");

const commitsArray = output
    .split("----DELIMITER----\n")
    .map(commit => {
        const [message, sha] = commit.split("\n");

        return { sha, message };
    })
    .filter(commit => Boolean(commit.sha));

const currentChangelog = fs.readFileSync("./CHANGELOG.md", "utf-8");
let newChangelog = `# Version ${getCurrentReleaseVersion} (${
    new Date().toISOString().split("T")[0]
    })\n\n`;

const item = ["BREAKING CHANGE: ", "feature: ", "chore: ", "fix: ", "docs: ", "ci: ", "style: ", "refactor: ", "test: ", "build: ", "perf: "];
function writeLog(commits, prefix) {
    let result = "";
    commits.forEach(commit => {
        if (commit.message.startsWith(prefix)) {
            let featuretxt = `* ${commit.message.replace(prefix,"")} ([${commit.sha.substring(0, 6)}](${repoUrl}/commit/${commit.sha}))`;
            result += featuretxt;
            result += "\n";
        }
    });
        if (result !== ""){
            newChangelog += `## Branch ${getGitBranch}\n`;
            newChangelog += `# ${prefix}\n`;
            newChangelog += result;
            newChangelog += "\n";
        }
}
function writeDefaultLog(commits) {
    newChangelog += `## Branch ${getGitBranch}\n`;
    commits.forEach(commit => {
        if (item.findIndex(i => commit.message.startsWith(i))=== -1) {
            let featuretxt = `* ${commit.message} ([${commit.sha.substring(0, 6)}](${repoUrl}/commit/${commit.sha}))`;
            newChangelog += featuretxt;
            newChangelog += "\n";
        }
    });
    newChangelog += "\n";
}
item.forEach(i => writeLog(commitsArray, i));
writeDefaultLog(commitsArray)


// prepend the newChangelog to the current one
fs.writeFileSync("./CHANGELOG.md", `${newChangelog}${currentChangelog}`);

// update package.json
fs.writeFileSync("./package.json", JSON.stringify({ version: String(getCurrentReleaseVersion) }, null, 2));

// create a new commit
child.execSync('git add CHANGELOG.md');
child.execSync(`git commit -m "docs: Add change history to CHANGELOG.md file"`);
child.execSync(`git push origin ${getGitBranch}`);
