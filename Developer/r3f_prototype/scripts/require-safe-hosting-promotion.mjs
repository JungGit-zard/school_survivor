const nonce = process.env.ESCAPE_HOSTING_PROMOTION_NONCE

if (!nonce || !/^[a-f0-9-]{16,}$/i.test(nonce)) {
  console.error('Direct Firebase Hosting deploy is blocked. Use npm run deploy:hosting:safe -- <preview-channel>.')
  process.exit(1)
}

console.log('Safe Firebase Hosting preview promotion authorized.')
