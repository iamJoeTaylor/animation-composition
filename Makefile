NPMBIN = $(shell npm bin)
DIST = dist/animation-composition.js

all: clean dist

dist: $(DIST)

$(DIST): lib/animation-composition.js
	@mkdir -p $(shell dirname $(DIST))
	$(NPMBIN)/babel -o dist/animation-composition.js -m umd --module-id AnimationComposition lib/animation-composition.js

clean:
	rm -f $(DIST)

.PHONY: clean test
