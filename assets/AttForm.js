class AttForm {
    static forms = [];
    static instances = new Map();
    static events = {
        before: 'att-form:before',
        success: 'att-form:success',
        error: 'att-form:error',
        after: 'att-form:after',
        reset: 'att-form:reset',
    }

    constructor(form, config) {
        if (!(form instanceof HTMLFormElement)) {
            throw new Error('Не форма');
        }

        this.form = form;
        this.config = config;

        this.request = new Request(this.form.action, {
            method: 'post',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json'
            },
        });

        this.prepareEvents();

        AttForm.forms.push(this.form);
        AttForm.instances.set(this.form, this);
    }

    prepareEvents() {
        this.form.addEventListener('submit', async e => {
            e.preventDefault();

            this.formData = new FormData(this.form);

            this.clearErrors();

            // todo: возможно лучше проецировать события на сами формы & пологаться на всплытие
            const beforeEvent = new CustomEvent(AttForm.events.before, {
                cancelable: true,
                detail: {
                    form: this.form,
                    formData: this.formData,
                    attForm: this,
                },
            });


            AttForm?.Message?.before?.();

            if (!document.dispatchEvent(beforeEvent)) {
                return;
            }

            this.disableFields();

            try {
                const query = await fetch(this.request, { body: this.formData });
                const response = await query.json();

                const afterEvent = new CustomEvent(AttForm.events.after, {
                    cancelable: true,
                    detail: {
                        form: this.form,
                        formData: this.formData,
                        response,
                        attForm: this,
                    },
                });

                AttForm?.Message?.after?.(response.message);

                if (!document.dispatchEvent(afterEvent)) {
                    return;
                }

                if (!response.success) {
                    AttForm?.Message?.error?.(response.message);

                    const errorEvent = new CustomEvent(AttForm.events.error, {
                        cancelable: true,
                        detail: {
                            form: this.form,
                            formData: this.formData,
                            response,
                            attForm: this,
                        },
                    });

                    if (!document.dispatchEvent(errorEvent)) {
                        return;
                    }

                    for (const [name, message] of Object.entries(response.errors)) {
                        this.setError(name, message);
                    }

                    return;
                }

                this.clearErrors();
                AttForm?.Message?.success?.(response.message);

                const successEvent = new CustomEvent(AttForm.events.success, {
                    detail: {
                        form: this.form,
                        formData: this.formData,
                        response,
                        attForm: this,
                    },
                });

                if (!document.dispatchEvent(successEvent)) {
                    return;
                }

                // todo: ???
                if (typeof window.grecaptcha !== 'undefined') {
                    window.grecaptcha.reset();
                }

                // todo: для att-select -> реализовать обработку события по очищению поля form.reset()
                if (this.config.clearFieldsOnSuccess) {
                    this.form.reset();
                }
            } catch (e) {
                console.error(e);
            } finally {
                this.enableFields();
            }
        });

        this.form.addEventListener('reset', () => {
            const resetEvent = new CustomEvent(AttForm.events.reset, {
                detail: {
                    form: this.form,
                    attForm: this,
                },
            });

            document.dispatchEvent(resetEvent);
            this.clearErrors();
            AttForm?.Message?.reset?.();
        });

        ['change', 'input'].forEach(eventName => {
            this.form.addEventListener(eventName, ({ target }) => {
                this.clearError(target.getAttribute('name'));
            });
        });
    }

    clearErrors() {
        this.fields.forEach(field => this.clearError(field.getAttribute('name')));
    }

    clearError(name) {
        const fields = this.getFields(name);
        fields.forEach(field => {
            if (this.inputInvalidClasses) {
                field.classList.remove(...this.inputInvalidClasses);
            }
            field.removeAttribute('aria-invalid');
        });

        const errors = this.getErrors(name);
        errors.forEach(error => {
            error.style.display = 'none'
            error.innerHTML = ''
        });

        const customErrors = this.getCustomErrors(name);
        if (this.customInvalidClasses) {
            customErrors.forEach(({ classList }) => classList.remove(...this.customInvalidClasses));
        }

        return {
            fields,
            errors,
            customErrors,
        };
    }

    setError(name, message = '') {
        this.getFields(name).forEach(field => {
            if (this.inputInvalidClasses) {
                field.classList.add(...this.inputInvalidClasses);
            }
            field.setAttribute('aria-invalid', true);
        });

        if (this.customInvalidClasses) {
            this.getCustomErrors(name).forEach(({ classList }) => classList.add(...this.customInvalidClasses));
        }

        this.getErrors(name).forEach(error => {
            error.style.display = '';
            error.innerHTML = message;
        });
    }

    enableFields() {
        this.elements.forEach(field => field.removeAttribute('disabled'));
    }

    disableFields() {
        this.elements.forEach(field => field.setAttribute('disabled', ''));
    }

    getFields(name) {
        if (!name) {
            return [];
        }
        // todo:
        //  вытянуть name[key] - < и преобрезовать в name.key (?) > {name.min, name.0}
        //  использование dots - всегда - js validation - применить
        //  .
        //  or name.key => name[key] - преобрезования вложености
        return Array.from(this.form.querySelectorAll(`[name="${name}"], [name="${name}[]"]`));
    }

    getErrors(name) {
        if (!name) {
            return [];
        }

        return Array.from(this.form.querySelectorAll(`[data-error="${name}"], [data-error="${name}[]"]`));
    }

    getCustomErrors(name) {
        if (!name) {
            return [];
        }

        return Array.from(this.form.querySelectorAll(`[data-custom="${name}"]`));
    }

    get elements() {
        return Array.from(this.form.elements);
    }

    get fields() {
        return this.elements.filter(({ tagName }) => ['select', 'input', 'textarea'].includes(tagName.toLowerCase()));
    }

    get inputInvalidClasses() {
        return this.config.inputInvalidClass ? this.config.inputInvalidClass.split(' ') : [];
    }

    get customInvalidClasses() {
        return this.config.customInvalidClass ? this.config.customInvalidClass.split(' ') : [];
    }

    // todo: ?
    static sanitizeHTML(str = '') {
        return str.replace(/(<([^>]+)>)/gi, '');
    }

    static create(key, config) {
        // todo: внедрить AttNotify
        // if (
        //     config.defaultNotifier
        //     && typeof window.Notyf === 'function'
        //     && typeof AttForm.Message === 'undefined'
        // ) {
        //     const notyf = new Notyf();
        //
        //     AttForm.Message = {
        //         success(message) {
        //             notyf.success(message);
        //         },
        //         error(message) {
        //             notyf.error(message);
        //         },
        //     }
        // }

        // todo: внедрить AttNotify (error, success) / AttAlert <для лучшего взаимодейсвия>

        const forms = document.querySelectorAll(`form[data-att-form="${key}"]`);
        if (!forms) {
            throw new Error(`В документе не найдено форм по селектору: form[data-att-form="${key}"]`);
        }

        forms.forEach(form => {
            new this(form, config);
        });
    }
}

window.AttForm = AttForm
