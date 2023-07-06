import { Octokit } from "https://esm.sh/octokit@2.1.0?target=deno";
import "https://deno.land/std@0.193.0/dotenv/load.ts";

const octokit: Octokit = new Octokit({ auth: Deno.env.get('KEY') });
const {
    data: { login },
} = await octokit.rest.users.getAuthenticated();
console.log("Hello, %s", login);

const foundpages: any[] = []

const repos: any[] = await octokit.paginate(octokit.rest.repos.listForUser, {username: login});
for (const repo of repos) {
    const deployments: {
        data: any[]
    } = await octokit.rest.repos.listDeployments({owner: login, repo: repo.name});
    if (deployments.data.length !== 0) {
        if (deployments.data.some(d => d.environment === 'github-pages')) {
            foundpages.push(repo);
        }
    }
}

const replacements = {
    '%%user%%': `[${login}](https://github.com/${login})`,
    '%%pages%%': foundpages.map(repo => `- [${repo.name}](https://${login}.github.io/${repo.name}) ([code](${repo.html_url})) - ${repo.description}`).join('\n'),
    '%%other%%': repos.filter(repo => !foundpages.includes(repo) && repo.homepage && !repo.fork).map(repo => `- [${repo.name}](${repo.homepage}) ([code](${repo.html_url})) - ${repo.description}`).join('\n'),
    '%%no%%': repos.filter(repo => !foundpages.includes(repo) && !repo.homepage && !repo.fork).map(repo => `- [${repo.name}](${repo.html_url}) - ${repo.description}`).join('\n'),
    '%%forks%%': repos.filter(repo => repo.fork).map(repo => `- [${repo.name}](${repo.html_url}) - ${repo.description}`).join('\n'),
}

const template = Deno.readTextFileSync('TEMPLATE.md');
const readme = Object.entries(replacements).reduce((acc, [key, value]) => acc.replace(key, value), template);

Deno.writeTextFileSync('README.md', readme);

console.log("Done")
Deno.exit(0);