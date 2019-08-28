# Patchwork's Design Principles

This document describes the design goals and philosophy of Patchwork. Features of and changes to Patchwork should always aim to follow these principles. If we really want to add a feature/make a change to Patchwork that goes against these principles, we should think about changing the principles first, rather than ignoring them and making the change anyway.

This document should be version tracked, and any change to it should go through the [advice process](http://www.reinventingorganizationswiki.com/Decision_Making) with the stakeholders listed below.

### Stakeholders
* Patchwork contributors
* Patchwork users
* The broader Scuttlebutt community
* People outside the Scuttlebutt community who might be affected

## Design goals

### Goals and scope: Patchwork should...
* Follow the [Scuttlebutt principles](https://www.scuttlebutt.nz/principles/)
* Be a client that people can feel confident recommending to their friends who aren't using Scuttlebutt, and who might not have much tech knowledge
* Be safe (privacy, blocking, etc)
* Be usable (not confusing or broken; clear explanations of new concepts)
* Be healthy (non-addictive, calm, consentful)
* Be accessible (to the extent practical -- some a11y features are hard to retrofit into the existing code)
* Be a fun client to use -- users should enjoy using it and, in a positive way, be tempted to try other Scuttlebutt clients
* Look good
    
### Non-goals: Patchwork is not...
* A place where we experiment with new features - Try it in other clients first
* For message types outside the core social networking use case. Messages such as posts, comments, gatherings, and blogs are in scope; messages such as chess and git-ssb are out of scope.


### Roadmap
* Eventually retire Patchwork 3, potentially transferring the Patchwork name to another client, which might become Patchwork 4
* Maintain functionality until Patchwork 3 is retired.  Focus more on maintenance than new features.
* Potentialy remove less-used features if we don't have energy to maintain them
* While accepting that Patchwork 3 is a legacy codebase, try to keep it easy to maintain, and help out (potential) new contributors
