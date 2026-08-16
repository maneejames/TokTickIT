# Lab 1 — AI Use and Reflection

I used the Antigravity coding agent through my Google Cloud Platform account. I mainly used Gemini 3.5 Flash as the LLM with a thinking level of Medium.

## Selected Key Prompts

| Prompt Name | Actual Prompt Text |
|-------------|--------------------|
| Set Up Full-Stack Project | Look all of the file structure and check the requirement in the first issue. Then tell me how to test visually<br><br>**My Reflection:** This is not the exact prompt cause the history is dissapear but the work is very good it create the Readme.md file and add instruction to start the project sucessful |
| Plan Feature 2 | Next Feature Section: (Give Requirement) Tell me what you need to do to sucess all requirement. If you want to know anything more ask me.<br><br>**My Reflection:** It's planning the work very well but missing the the edit of Readme.md file. I added it and run all the plan |
| Implement Health Check | Go ahead and follow the existing Bootstrap theme conventions. Don't forget to tell me how to test and add more needed information to README.md <br><br>**My Reflection:** The agent set up the endpoint and test cleanly. I verified `npm test` in the server directory and confirmed the test passed. |
| Implement Category Feature | The next one is Database preparation (Give all Requirement) I don't have the Postgrest in my PC, I will use the docker insead can you tell me what your plan for implement these.<br><br>**My Reflection:** I verified all the plan and tell ai make sure tell me how to check test manually. The implement is succesfully. |
| Build Category API & Check System UI | Give the requirement and the UI markdown for guide. Can you create the plan so I can know that you understanding what I want to make<br><br>**My Reflection:** It create everything successful. The UI and tests were generated as requested. I tested both success and error states in the browser and verified all 3 client tests passed. |
| Review Final Lab 1 Work | Review the completed TokTickIT Lab 1 implementation against all acceptance criteria across all 4 issues. Ensure all 5 tests pass (2 backend, 3 frontend), README instructions are comprehensive, and documentation in `docs/lab-01/` is complete.<br><br>**My Reflection:** Helped catch missing test evidence in documentation and ensured complete end-to-end verification before opening the final PR. |

## Reflection
Using the Antigravity agent with Gemini 3.5 Flash (Medium thinking level) made it straightforward to break down Lab 1 into discrete tasks aligned with GitHub Issues. Explicitly instructing the model to focus only on the scope of one issue at a time prevented code drift. I verified every output by running tests locally and inspecting database state directly rather than assuming correctness.
