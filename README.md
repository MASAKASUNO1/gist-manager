# Gist Manager

GitHub Gistの作成・表示・更新・削除を行うVSCode拡張機能

## 機能

| コマンド | 説明 |
|---------|------|
| `Gist: List My Gists` | Gist一覧を表示して選択・開く |
| `Gist: Create New Gist` | 現在のエディタ内容から新規Gist作成 |
| `Gist: Update Gist` | 開いているGistを更新、または選択して更新 |
| `Gist: Delete Gist` | Gistを選択して削除 |

## 使い方

1. `Cmd+Shift+P` (Mac) / `Ctrl+Shift+P` (Windows/Linux) でコマンドパレットを開く
2. `Gist:` と入力してコマンドを選択

## 認証

初回実行時にVSCodeのGitHub認証ダイアログが表示されます。`gist`スコープでの認証を許可してください。

## 開発

```bash
# 依存関係のインストール
npm install

# コンパイル
npm run compile

# ウォッチモード
npm run watch
```

### デバッグ実行

1. VSCodeでこのプロジェクトを開く
2. F5キーで拡張機能開発ホストを起動

### パッケージング

```bash
npm install -g @vscode/vsce
vsce package
code --install-extension gist-manager-0.0.1.vsix
```
