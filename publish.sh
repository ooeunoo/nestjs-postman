#!/bin/bash

# 현재 버전 가져오기
current_version=$(node -p "require('./package.json').version")

# 버전 증가
new_version=$(npm version patch)

# 빌드
npm run build

# npm에 배포
npm publish

echo "Published version $new_version"

# Git에 변경사항 커밋 및 푸시
# git add .
# git commit -m "Bump version to $new_version"
# git push origin main
# git push --tags

# echo "Changes pushed to Git"