import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));

function run(cmd) {
	console.log(`\n=== ${cmd} ===\n`);
	try {
		console.log(
			execSync(cmd, { cwd: dir, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 })
		);
	} catch (e) {
		if (e.stdout) console.log(e.stdout);
		if (e.stderr) console.error(e.stderr);
		process.exitCode = e.status ?? 1;
	}
}

run('git log --oneline 4c87ba85..HEAD');
run('git diff 4c87ba85...HEAD --stat');
run('git diff HEAD --stat');
run('git ls-files --others --exclude-standard');
run(
	"git diff 4c87ba85...HEAD -- gutenberg/ docs/ tests/ classes/ '*.php' '*.js' '*.scss' '*.md' ':!build/**'"
);
