const core = require('@actions/core')
const github = require('@actions/github')
const arraySort = require('array-sort')
const stringify = require('csv-stringify/lib/sync')

const token = core.getInput('token', {required: true})
const octokit = github.getOctokit(token)

const eventPayload = require(process.env.GITHUB_EVENT_PATH)
const org = core.getInput('org', {required: false}) || eventPayload.organization.login

// Get epoch time in ms
const days = core.getInput('days', {required: false}) || '7'
const intervalDays = Date.now() - days * 24 * 60 * 60 * 1000

const fromdate = core.getInput('fromdate', {required: false}) || ''
const fromDateEpoch = Math.floor(new Date(fromdate))

const todate = core.getInput('todate', {required: false}) || ''
const toDateEpoch = Math.floor(new Date(todate))

// Verify date against regex
const regex = '([0-9]{4}-[0-9]{2}-[0-9]{2})'
const flags = 'i'
const re = new RegExp(regex, flags)

let columnDate
let fileDate

  // Retrieve Git audit log data and filter by date range
;(async () => {
  try {
    const dataArray = []
    const gitArray = []
    let logDate

    const data = await octokit.paginate('GET /orgs/{org}/audit-log', {
      org: org,
      include: 'git'
    })

    data.forEach((element) => {
      if (re.test(fromdate, todate) !== true) {
        if (element['@timestamp'] >= intervalDays) {
          dataArray.push(element)
        }
        logDate = `the last ${days} days`
        fileDate = `${days}-days`
        columnDate = `<${days} days`
      } else {
        if (element['@timestamp'] >= fromDateEpoch && element['@timestamp'] <= toDateEpoch) {
          dataArray.push(element)
        }
        logDate = `${fromdate} to ${todate}`
        fileDate = `${fromdate}-to-${todate}`
        columnDate = logDate
      }
    })

    console.log(`Retrieve Git audit log for ${logDate}`)

    // Sum and sort Git audit log data per organization member
    const gitSum = dataArray.reduce((res, {actor, action}) => {
      res[actor] = {
        ...res[actor],
        [action]: 1 + (res[actor] && res[actor][action] ? res[actor][action] : 0)
      }
      return res
    }, {})

    const gitMap = Object.keys(gitSum).map((key) => {
      return {
        actor: key,
        ...gitSum[key]
      }
    })

    gitMap.forEach((element) => {
      const memberName = element['actor']
      const gitClone = element['git.clone'] || 0
      const gitPush = element['git.push'] || 0
      const gitFetch = element['git.fetch'] || 0

      console.log(`${memberName} ## Clones: ${gitClone}, Pushes: ${gitPush}, Fetches: ${gitFetch}`)

      gitArray.push({memberName, gitClone, gitPush, gitFetch})
    })
    await pushAuditReport(gitArray)
  } catch (error) {
    core.setFailed(error.message)
  }
})()

async function pushAuditReport(gitArray) {
  try {
    // Set sorting settings and add header to array
    const columns = {
      memberName: 'Username',
      gitClone: `Git clones (${columnDate})`,
      gitPush: `Git pushes (${columnDate})`,
      gitFetch: `Git fetches (${columnDate})`
    }
    const sortColumn = core.getInput('sort', {required: false}) || 'gitClone'
    const sortArray = arraySort(gitArray, sortColumn, {reverse: true})
    sortArray.unshift(columns)

    // Convert array to csv
    const csv = stringify(sortArray)

    // Prepare path/filename, repo/org context and commit name/email variables
    const reportPath = `reports/${org}-${new Date().toISOString().substring(0, 19) + 'Z'}-${fileDate}.csv`
    const committerName = core.getInput('committer-name', {required: false}) || 'github-actions'
    const committerEmail = core.getInput('committer-email', {required: false}) || 'github-actions@github.com'
    const {owner, repo} = github.context.repo

    // Push csv to repo
    const opts = {
      owner,
      repo,
      path: reportPath,
      message: `${new Date().toISOString().slice(0, 10)} Git audit log report`,
      content: Buffer.from(csv).toString('base64'),
      committer: {
        name: committerName,
        email: committerEmail
      }
    }

    console.log(`Pushing final CSV report to repository path: ${reportPath}`)

    await octokit.rest.repos.createOrUpdateFileContents(opts)
  } catch (error) {
    core.setFailed(error.message)
  }
}
