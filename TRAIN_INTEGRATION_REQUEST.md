# Kerbside train integration request

This branch exists to trigger the repository's guarded train-mode integration workflow. The workflow patches only the two train asset references into `bus.html`, synchronises version 0.7.27, runs the new train regression and the existing bus browser regression in Chromium and WebKit, then commits the validated integration back to this branch.
