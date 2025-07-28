document.querySelectorAll('.form-select-chosen').forEach(element => {
    try {
        let isVisible = false;
        let isSync = false;

        const input = element.querySelector('.form-select-chosen__input');
        const output = element.querySelector('.form-select-chosen__output');
        const outputWrap = element.querySelector('.form-select-chosen__output-wrap');
        const blockSearch = element.querySelector('.form-select-chosen__search');
        const inputSearch = element.querySelector('.form-select-chosen__search-input');
        const blockOptions = element.querySelector('.form-select-chosen__options');

        !input && console.error('not .form-select-chosen__input: ', element);
        !output && console.error('not .form-select-chosen__output: ', element);
        !outputWrap && console.error('not .form-select-chosen__output-wrap: ', element);
        !blockSearch && console.error('not .form-select-chosen__search: ', element);
        !inputSearch && console.error('not .form-select-chosen__search-input: ', element);
        !blockOptions && console.error('not .form-select-chosen__options: ', element);

        outputWrap.addEventListener('click', () => {
            blockSearch.classList.toggle('is-visible');
            isVisible = !isVisible;
            isVisible && (isSync = true);
            isVisible && inputSearch.focus();
        });

        document.addEventListener('click', (e) => {
            if (isVisible && !isSync && e.target.closest('.form-select-chosen__search') !== blockSearch) {
                isVisible = false;
                blockSearch.classList.remove('is-visible');
                inputSearch.value = '';
                searchValues('');
            }
            isSync = false;
        });

        inputSearch.addEventListener('input', event => {
            searchValues(event.target.value);
        });

        function searchValues(str) {
            let count = 0;
            blockOptions.querySelectorAll('.form-select-chosen__option:not(.is-not-search)').forEach(element => {
                if (element.textContent.toLowerCase().startsWith(str.toLowerCase())) {
                    element.style.display = "";
                    count++;
                } else {
                    element.style.display = "none";
                }
            });

            count ? blockOptions.classList.remove('is-empty') : blockOptions.classList.add('is-empty');
        }

        function addEvent(element) {
            element.classList.contains('form-select-chosen__option') && element.addEventListener('click', function (event) {
                isVisible = false;
                blockSearch.classList.remove('is-visible');
                input.value = element.getAttribute('data-value');
                output.textContent = element.textContent;
                blockOptions.querySelectorAll('.form-select-chosen__option').forEach(element => element.classList.remove('is-selected'));
                element.classList.add('is-selected');

                inputSearch.value = '';
                searchValues('');

                input.dispatchEvent(new Event('change'));
            });
        }

        blockOptions.querySelectorAll('.form-select-chosen__option').forEach(element => addEvent(element));

        (new MutationObserver(function (mutationsList, observer) {
            for (let mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(element => addEvent(element));
                    input.value = 0;
                    output.textContent = '';
                }
            }
        })).observe(blockOptions, { childList: true });
    } catch (err) {
        console.log(err);
    }
});