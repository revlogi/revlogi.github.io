---
title: "Gitlet"
description: "document the my implementation of gitlet"
publishDate: "12 December 2025"
tags: ["cs61b", "data structure"]
---

## Some Words

As a novice programmer, I found this project to be a significant challenge. To bridge the gap, I utilized Gemini as a primary resource. I developed my own logic first and then used Gemini to refine my approach.

A comprehensive understanding of the spec is critical to avoid missing edge cases. I found it particularly beneficial (especially as a non-native English speaker) to leverage Gemini to summarize the complex requirements. Using the AI to decompose the spec and organize the various scenarios into a clear structure reduced the likelihood of overlook minute details (although I still missing a lot during the implementation).

The documentation below does not strictly follow the standard design document template CS61b provides. Instead, I have documented specific problems and implementation details that were particularly meaningful to my understanding of the system.

---

## Folder Structure

```
.gitlet 
|-- objects 
| |-- commits
|-- refs 
| |-- heads 
|-- HEAD 
|-- staging_area
| |-- index
```

---

## Classes Implementation

Classes:
```
 Main
 Repository
 Commit
 (Missing Piece: Blob)
 Branch
 StagingArea
 Remote
```


### Main Class

Acts as the entry point for the Gitlet system. It parses command-line arguments, performs initial validation (checking for command existence and operand count), and dispatches the validated requests to the `Repository` class. It serves as the interface between the user and the backend logic.

### Repository Class

Serves as the central management engine for the version control system. It maintains the state of the working directory and the `.gitlet` folder structure (e.g., `HEAD`, `refs`, `objects`). This class implements the high-level logic for commands (like `init`, `merge`, `checkout`) and delegates specific object manipulation (creating commits, updating the index) to the `Commit` and `StagingArea` classes.

### Commit Class

Represents a snapshot of the project at a specific point in time. Each `Commit` instance encapsulates metadata (timestamp, log message, parent references) and a mapping of file names to blob references (SHA-1 hashes). This class handles the serialization process to persist commit objects into the `objects/commits` directory.

> Blob: A dedicated `Blob` class was not implemented. Since blobs are immutable data identified solely by their SHA-1 hash, they can be handled directly as files on disk. After implementation I realised that a blob class would provide object-oriented consistency, but my current implementation works fine and its not be a easy task to refactor it. 

#### Process of Creating a Commit

1. **Instantiation & Snapshotting:** Initialize a new `Commit` object containing the current **timestamp**, the user's **log message**, and the **parent hash** (pointing to the current HEAD). The commit's file tracking (`blobs` map) is constructed by inheriting the parent's blobs and applying the changes (additions and removals) currently defined in the `StagingArea`.
    
2. **Serialization & Hashing:** Convert the `Commit` instance into a byte stream (serialization). Compute the SHA-1 hash of this byte stream to generate the commit's unique 40-character identifier (UID).
    
3. **Persistence:** Save the serialized object into a file within the `.gitlet/objects/commits` directory, using the generated SHA-1 hash as the filename. Finally, update the current branch pointer to reference this new commit hash.

### StagingArea Class

Manages the "index"—the staging area where changes are prepared before committing. It handles the persistence (loading/saving) and clearing of the staging state.

- **Data Structure Decision:** The class separates logic for additions and removals to handle edge cases effectively:
    
    - **`addedFile` (HashMap<String, String>):** Maps file names to their SHA-1 hashes. This tracks the specific version of the content to be committed.
        
    - **`removedFile` (HashSet<String>):** Contains only file names. A `Set` is used instead of a `Map` because the operation is binary (the file is marked for removal); tracking the content hash is unnecessary when the intent is to exclude the file from the next snapshot.

#### Persistence Implementation

The state of the staging area is persisted in a file named `index` located within the `.gitlet/staging_area` directory.

- **Loading State:** When a command that modifies the staging area (like `add` or `rm`) is executed, the `StagingArea`constructor deserializes the `index` file to restore the previous state (the map of added files and set of removed files) into memory.
    
- **Saving State:** After modifications are made, the object is serialized back to the `index` file to ensure changes are saved.
    
- **Reset:** Upon a successful commit, the `index` file is overwritten with an empty staging area to prepare for the next cycle of changes.


### Branch Class

Manages the creation, deletion, and updating of branch references (pointers) within the `refs/heads` directory. It abstracts the file I/O required to track which commit each branch currently points to.

- **Head Management:** Updates the `HEAD` file to reflect the active branch or commit hash.
    
- **Split Point Calculation:** Implements the graph traversal logic (BFS) required to identify the "split point" (Lowest Common Ancestor) between the current branch and a given branch, which is a critical prerequisite for the `merge`operation.

### Remote Class

Handles logic for interacting with remote repositories, including file path validation, object transfer, and branch updates.

---

## Critical Commands

### rm

This command handles file removal based on the file's state in the Staging Area and the Current Commit.

Check the file against two conditions. If **neither** condition is met, print: `No reason to remove the file.`

- Condition A: The file is Staged (in `addedFiles`)
    
    - Unstage it (remove it from the `addedFiles` map).
        
- Condition B: The file is Tracked (in the current `HEAD` commit)
    
    - Stage it for removal (add it to the `removedFiles` list/set).
        
    - Remove the file from the CWD if it exists there.
        

> A file can trigger both conditions. If a file is both staged and tracked, it must perform both actions (unstage it AND mark it for removal/delete it).


### status

**Section: Modifications Not Staged For Commit**

This section lists files that exist in the CWD (or were deleted from the CWD) but have changes that have not been added to the staging area yet.

There are four specific scenarios to check:

**A. Tracked Files (Committed vs. CWD)**

- **Modified:** The file is tracked in the current commit, has changed in the CWD, but is **not** currently staged (not in `addedFiles`).
- **Deleted:** The file is tracked in the current commit and has been deleted from the CWD, but has **not** been staged for removal (not in `removedFiles`).
    

**B. Staged Files (Staging Area vs. CWD)** 
- **Modified:** The file is currently staged (in `addedFiles`), but the version in the CWD has changed content compared to the staged version. 
- **Deleted:** The file is currently staged (in `addedFiles`), but it has been deleted from the CWD.


### merge

The merge command requires two distinct phases: locating the common ancestor (Split Point) and reconciling file differences between the branches.

#### 1. Finding the Split Point

**Goal:** Identify the "Latest Common Ancestor" (LCA) between the current branch and the given branch.

- **Data Structures:**
    
    - `HashSet<String>`: Used to store the ancestry of the current branch for O(1) lookups.
        
    - `Queue<String>`: Used to implement Breadth-First Search (BFS) for traversal.
        
- **Algorithm:**
    
    1. Mark Ancestors (Current Branch): Traverse the history of the Current Branch (starting from HEAD). Add the hash of every visited commit to the `HashSet`.
        
    2. Find Nearest Match (Given Branch): Perform a BFS traversal on the Given Branch.
        
        - For each commit visited, check if its hash exists in the `HashSet`.
            
        - The **first match** found is the Split Point (closest common ancestor).
            

#### 2. Reconciling File Differences

**Goal:** Determine the fate of each file based on its state in three commits: **Split Point**, **Current**, and **Given**.

- **Core Logic (Three-Way Merge):**
    
    - Same Change (or No Change): If the file is identical in all three, or changed identically in both branches, do nothing.
        
    - Unilateral Change: If the file changed (or was removed) in one branch but remained the same in the other, adopt the changed version.
        
    - Conflict: If the file changed in both branches in different ways, flag a conflict.
        
- Implementation Steps:
    
    1. File Collection: Load all filenames from the _Current_, _Given_, and _Split_ commits into a single `Set<String>`(Union of all files). This ensures that files deleted or added in any branch are not missed.
        
    2. Per-File Iteration: Iterate through this master set and apply the merge rules to each file individually.
        
- Logic Evolution (Refactoring):
    
    - _Initial Approach (Incorrect):_ I initially attempted to use three global booleans (`currentChanged`, `givenChanged`, `differentChange`) to manage state. This was incorrect because merge logic must be atomic per file, not applied to the commit as a whole.
        
    - _Corrected Approach:_ The logic is now handled inside the loop for every file separately.
        
        - Files are staged, removed, or overwritten with conflict markers individually.
            
        - A single boolean flag (`conflictEncountered`) is tracked throughout the loop. If _any_ file triggers a conflict, this flag ensures the "Encountered a merge conflict" message is printed at the end.

### push

- **Goal:** Upload local commits that the remote does not yet have.
    
- **Logic (Reverse-BFS):**
    
    1. Start a Breadth-First Search (BFS) from the **Local Head** backwards.
        
    2. Traverse through parents until you find the commit matching the **Remote Head**.
        
    3. **Validation:** If you reach the initial commit without finding the Remote Head, the push fails (history mismatch).
        
    4. **Transfer:** Collect all commits visited during the traversal (the "new" history). Copy these commit files—and any missing **Blobs** they reference—into the remote's `objects` directory.
        
    5. **Finalize:** Update the remote branch reference (e.g., `refs/heads/master`) to point to the Local Head hash.
        

### fetch

- **Goal:** Download remote commits that the local repo does not yet have.
    
- **Naive Approach:** Copy _all_ remote objects.
    
    -  Slow runtime; requires checking every file in the remote `objects` folder, even ones you already have.
        
- **Optimized Approach (BFS):**
    
    1. Start BFS from the **Remote Branch Head**.
        
    2. Traverse backwards through the remote history.
        
    3. **Stop Condition:** If you encounter a commit hash that already exists in the **local** `objects` folder, **stop traversing that path**. You already own that history.
        
    4. **Transfer:** For every _missing_ commit found:
        
        - Copy the commit object to local.
            
        - Read the commit to find its blobs. Copy any blobs that are missing locally.
            
    5. **Finalize:** Create or update the remote branch pointer locally (e.g., `refs/heads/origin/master`).
        

> Remote Path Handling: The user provides a string path (e.g., `../D1/.gitlet`). I convert this string into a `File` object to interact with the OS file system: `File remoteGitletDir = new File(remotePathString);` (Remember `File` object in java is only an address.)