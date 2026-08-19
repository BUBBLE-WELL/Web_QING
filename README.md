# Web_QING

Cui Wanqing's bilingual portfolio and project archive.

## Visit the website

- [中国访问 / Visit from China](https://jiyiji.cn/webqing/)
- [海外访问 / Visit from overseas](https://tiny-waterfall-0f0a.jellycwq.workers.dev/)

<details>
<summary>Maintainer notes</summary>

This repository is the reviewed public-release mirror. Development happens in the local `re-job-hunter/h5/h5-static` workspace; do not develop the application independently here.

### Release contract

1. Validate the development source.
2. Promote only paths in `h5/release/public-files.txt` with `promote-webqing.ps1`.
3. Review the release-branch diff, then commit, open a pull request, and merge to `main`.
4. Deploy the merged revision to both production targets.
5. Verify HTTP responses, runtime references, PostHog events, and deployed file hashes before calling the release synchronized.

`wrangler.jsonc` configures the overseas static deployment. `h5-static/.assetsignore` is default-deny so review notes, repository metadata, and non-manifest files are not uploaded.

Vercel and GitHub Pages are not production targets for this release topology.

</details>
