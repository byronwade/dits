# Workflow Verification: "Quick Fix"

Scenario validating end-to-end system behavior.

1. Editor A imports 1TB footage and runs `dits push` (bulk upload).
2. Editor B needs a minor credits fix on a rendered master.
3. Editor B runs `dits checkout master.mov`.
4. Dits mounts a virtual file and downloads only header atoms (~5MB).
5. Editor B scrubs; required chunks are fetched just-in-time.
6. Editor B saves and runs `dits push`.
7. System compares and uploads only changed frames + new header (~15MB).
8. Editor A pulls; elapsed time ~30 seconds.


