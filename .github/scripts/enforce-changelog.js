
async function run({ core, github, context }) {
  const LABEL_NAME = 'skip changelog';
  const labels = context.payload.pull_request.labels || [];
  if (labels.some(label => label.name === LABEL_NAME)) {
    core.info(`PR has '${LABEL_NAME}' label. Skipping step.`);
    return;
  }

  const prAuthor = context.payload.pull_request.user.login;
  const prNumber = context.payload.pull_request.number;
  const repoOwner = context.repo.owner;
  const repoName = context.repo.repo;

  if (prAuthor === 'dependabot[bot]' || prAuthor === 'dependabot') {
    core.info(`PR #${prNumber} is authored by Dependabot. Adding label...`);
    await github.rest.issues.addLabels({
      owner: repoOwner,
      repo: repoName,
      issue_number: prNumber,
      labels: [LABEL_NAME]
    });
    core.info(`Adding '${LABEL_NAME}' label to dependabot PR.`);
    return;
  }

  // no paging since we only check the first 200 files
  const { data: files } = await github.rest.pulls.listFiles({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: context.payload.pull_request.number,
    per_page: 200
  });

  if (!files.some(f => f.filename === 'CHANGELOG.md')) {
    core.setFailed(`CHANGELOG.md is not part of this PR. If this happens on purpose add label 'skip changelog' to the PR.`);
    return;
  }

  core.info('Changelog found in PR.');
}

module.exports = run;
