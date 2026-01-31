## Git Workflow – ZeroHour (BeachHack)

Repo flow:
**Template → Fork → [https://github.com/Samurai-beachhack/zerohour](https://github.com/Samurai-beachhack/zerohour)**

---

## Clone (one time)

```bash
git clone https://github.com/Samurai-beachhack/zerohour.git
```

---

## Development Rules

* **Never work on `main`**
* **Every change must be in a new branch**

### Create a branch

```bash
git switch main
git pull origin main
git switch -c branch-name
```

Start coding on the new branch.

---

## Commit Guidelines

* Commit small, logical changes
* Avoid large single commits
* Short commit messages preferred

```bash
git add .
# or: git add file1 file2
git commit -m "type: short message"
```

### Commit message convention

* `docs:` Update README
* `feat:` Add login page
* `fix:` Fix auth bug

---

## Push Branch (for PR)

```bash
git push origin branch-name
```

(No need to switch to `main` before pushing)

---

## Create Pull Request (GitHub)

1. Go to: [https://github.com/Samurai-beachhack/zerohour](https://github.com/Samurai-beachhack/zerohour)
2. Click **Compare & pull request**
3. Set base repository to
   `Samurai-beachhack/zerohour`
4. Click **Create pull request**
5. Another member will review and merge

---

## Delete Branch (after merge)

```bash
git switch main
git pull origin main
git branch -d branch-name
```

---

## Make New Changes

Repeat the same workflow for every new task.

---

## Help / Recovery

### Accidentally worked on `main`

```bash
git switch main
git switch -c rescue-branch
git reset --hard origin/main
git switch rescue-branch
```

Your changes are now safe in `rescue-branch`.
Continue work and push normally.

### Recover commits from a deleted / wrong branch (cherry-pick)

If you committed on a branch that was already merged or deleted:

1. Create a new branch from `main`

```bash
git switch main
git pull origin main
git switch -c new-branch-name
```

2. Copy the commit into the new branch

```bash
git cherry-pick <commit-hash>
```

3. Push and open PR

```bash
git push origin new-branch-name
```

Notes:

* Cherry-pick copies a commit into the current branch
* The new commit has a different hash
* Use this only for small, isolated commits

---

```md
> One task = one branch = one PR = delete branch = never reuse
```
---

## View Branches

```bash
git branch
```
