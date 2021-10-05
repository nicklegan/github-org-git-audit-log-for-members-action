# GitHub Organization Git Audit Log for Members Report Action

> A GitHub Action to generate a report that contains the total amount of Git clones, pushes and fetches per organization member for a set interval.

## Usage

The example [workflow](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions) below runs on a weekly [schedule](https://docs.github.com/en/actions/reference/events-that-trigger-workflows#scheduled-events) and can be executed manually using a [workflow_dispatch](https://docs.github.com/en/actions/reference/events-that-trigger-workflows#manual-events) event.

```yml
name: Git Audit Log for Members Report

on:
  schedule:
    # Runs on every Sunday at 00:00 UTC
    #
    #        ┌────────────── minute
    #        │ ┌──────────── hour
    #        │ │ ┌────────── day (month)
    #        │ │ │ ┌──────── month
    #        │ │ │ │ ┌────── day (week)
    - cron: '0 0 * * 0'
  workflow_dispatch:
    inputs:
      fromdate:
        description: 'Optional interval start date within the last 7 days (format: yyyy-mm-dd)'
        required: false # Skipped if workflow dispatch input is not provided
      todate:
        description: 'Optional interval end date within the last 7 days (format: yyyy-mm-dd)'
        required: false # Skipped if workflow dispatch input is not provided

jobs:
  git-audit-log-for-members-report:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v2

      - name: Get Git Audit Log for Members
        uses: nicklegan/github-org-git-audit-log-for-members-action@v1.0.0
        with:
          token: ${{ secrets.ORG_TOKEN }}
          fromdate: ${{ github.event.inputs.fromdate }} # Used for workflow dispatch input
          todate: ${{ github.event.inputs.todate }} # Used for workflow dispatch input
```

## GitHub secrets

| Name                 | Value                                              | Required |
| :------------------- | :------------------------------------------------- | :------- |
| `ORG_TOKEN`          | A `repo`, `read:org`scoped [Personal Access Token] | `true`   |
| `ACTIONS_STEP_DEBUG` | `true` [Enables diagnostic logging]                | `false`  |

[personal access token]: https://github.com/settings/tokens/new?scopes=repo,read:org&description=Git+Audit+Log+Action 'Personal Access Token'
[enables diagnostic logging]: https://docs.github.com/en/actions/managing-workflow-runs/enabling-debug-logging#enabling-runner-diagnostic-logging 'Enabling runner diagnostic logging'

:bulb: Disable [token expiration](https://github.blog/changelog/2021-07-26-expiration-options-for-personal-access-tokens/) to avoid failed workflow runs when running on a schedule.

## Action inputs

| Name              | Description                                                   | Default                     | Options                          | Required |
| :---------------- | :------------------------------------------------------------ | :-------------------------- | :------------------------------- | :------- |
| `org`             | Organization different than workflow context                  |                             |                                  | `false`  |
| `days`            | Amount of days in the past to collect data for (max 7 days)   | `7`                         |                                  | `false`  |
| `sort`            | Column used to sort the acquired audit log data               | `gitClone`                  | `gitClone`, `gitPush` `gitFetch` | `false`  |
| `committer-name`  | The name of the committer that will appear in the Git history | `github-actions`            |                                  | `false`  |
| `committer-email` | The committer email that will appear in the Git history       | `github-actions@github.com` |                                  | `false`  |

:bulb: The audit log retains [Git events for 7 days](https://docs.github.com/organizations/keeping-your-organization-secure/reviewing-the-audit-log-for-your-organization#using-the-rest-api). This is shorter than other audit log events.

## Workflow dispatch inputs

An additional option to retrieve Git audit log events by using a custom date interval.
If the below fields are left empty during [workflow dispatch input](https://github.blog/changelog/2020-07-06-github-actions-manual-triggers-with-workflow_dispatch/), the default interval option of set days from the current date, configured in `main.yml` will be used instead.

| Name                                                  | Value                                   | Required |
| :---------------------------------------------------- | :-------------------------------------- | :------- |
| `Optional interval start date within the last 7 days` | A date matching the format `yyyy-mm-dd` | `false`  |
| `Optional interval end date within the last 7 days`   | A date matching the format `yyyy-mm-dd` | `false`  |

## CSV layout

The results of all except the first column will be the sum of [Git audit log events](https://docs.github.com/organizations/keeping-your-organization-secure/reviewing-the-audit-log-for-your-organization#git-category-actions) for the requested interval per organization member.

| Column      | Description                                                   |
| :---------- | :------------------------------------------------------------ |
| Username    | Member part of the requested organization                     |
| Git clones  | Sum of Git clones for a set interval per organization member  |
| Git pushes  | Sum of Git pushes for a set interval per organization member  |
| Git fetches | Sum of Git fetches for a set interval per organization member |

A CSV report file will be saved in the repository **reports** folder using the following naming format: **`organization`-`date`-`interval`.csv**.
