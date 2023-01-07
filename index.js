const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');
const FormData = require('form-data');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

async function run() {
	if (!process.env.GITHUB_TOKEN) {
		throw new Error('GITHUB_TOKEN env not set!');
	}

	core.info('Getting changelog');

	// Get a release from the tag name
	const getReleaseResponse = await github.getOctokit(process.env.GITHUB_TOKEN).rest.repos.getReleaseByTag({
		owner: github.context.repo.owner,
		repo: github.context.repo.repo,
		tag: github.context.ref.replace("refs/tags/", "") // removes the 'refs/tags' portion of the string
	});

	// Get the outputs for the created release from the response
	const changelog = getReleaseResponse.data.body;
	const folder = core.getInput('folder');
	const name = core.getInput('name');
	const token = core.getInput('token');

	core.info('Changing directory');
	const workingDirectory = process.env.GITHUB_WORKSPACE + folder;
	process.chdir(workingDirectory);

	let type = '';

	if (fs.existsSync('Assets.toml')) {
		type = 'assets';
	} else if (fs.existsSync('Package.toml')) {
		type = 'packages';
	} else {
		throw new Error('Directory does not contain Assets.toml or Package.toml');
	}

	fs.rmSync(path.resolve(workingDirectory + '/.git'), { recursive: true, force: true });
	fs.rmSync(path.resolve(workingDirectory + '/Package.jpg'), { force: true });
	fs.rmSync(path.resolve(workingDirectory + '/Assets.jpg'), { force: true });

	core.info(`Resource type is ${type}`);

	const releaseFile = path.resolve(process.env.GITHUB_WORKSPACE + '/../release.zip');
	const output = fs.createWriteStream(releaseFile);
	const archive = archiver('zip');

	output.on('close', function() {
		core.info(archive.pointer() + ' total bytes');
		core.info('archiver has been finalized and the output file descriptor has closed.');

		const url = `https://api.nanos.world/store/v1/${type}/${name}/releases`;

		core.info(`Uploading to ${url}`);

		var data = new FormData();
		data.append('file',  fs.readFileSync(releaseFile), 'release.zip');
		data.append('changelog', changelog);

		var config = {
			method: 'post',
			url: url,
			headers: {
				'Authorization': `Token ${token}`,
				...data.getHeaders()
			},
			data : data
		};

		axios(config)
			.then(function (response) {
				core.info(response);
			})
			.catch(function (error) {
				core.error(JSON.stringify(error.response.data));
				core.setFailed(error);
			});
	});

	output.on('end', function() {
		core.info('Data has been drained');
	});

	archive.on('error', function(err) {
		throw err;
	});

	archive.on('warning', function(err) {
		if (err.code === 'ENOENT') {
			core.info(err.message);
		} else {
			throw err;
		}
	});

	archive.pipe(output);
	archive.directory(workingDirectory, false);
	archive.finalize();
	core.info('Zip file has been packaged');
}

try {
	run();
} catch (error) {
	core.setFailed(error.message);
}
