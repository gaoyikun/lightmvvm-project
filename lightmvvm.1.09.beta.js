/**
 * Version 1.09 beta, 2024.09.14 updated.
 */
class LightMvvm {
    constructor(options) {
        this.node = document.getElementById(options.nodeName);
        let template;
        const tplNode = document.querySelector('.tpl');
        if (this.node.innerHTML.trim() !== '' && !this.node.contains(tplNode)) {
            template = this.node.innerHTML;
        } else if (options.templateContent) {
            template = options.templateContent;
        } else if (this.node.querySelector('.tpl')) {
            template = this.node.querySelector('.tpl').innerHTML;
        } else {
            throw new Error('Template is Empty!');
        }
        this.template = Handlebars.compile(template);
        this.proxy = this.CreateObservable(options.data);
        this.previousDom = null; // 用于保存上次渲染的DOM结构
        this.Render();
    };

    CreateObservable(data) {
        return new Proxy(data, {
            set: (target, property, value) => {
                if (target[property] === value) return true; // 如果值未改变，则不更新
                target[property] = value;
                this.Render();
                return true;
            },
            deleteProperty: (target, property) => {
                delete target[property];
                return true;
            },
            get: (target, property) => {
                const value = target[property];
                if ((typeof value === 'object' || Array.isArray(value)) && value !== null) {
                    return this.CreateObservable(value);
                }
                return value;
            }
        });
    };

    BindingText = () => {
        const formItems = this.node.querySelectorAll("input[type='text'],input[type='email'],input[type='password'],input[type='search'],input[type='number'],input[type='date'],textarea");
        formItems.forEach(item => {
            const key = item.getAttribute("data-binding");
            if (key) {
                const needsNestedHandling = key.includes('.') || key.includes('[');
                if (needsNestedHandling) {
                    item.value = getNestedValue(this.proxy, key); // 使用 getNestedValue 处理嵌套路径
                    item.addEventListener('input', (event) => {
                        setNestedValue(this.proxy, key, event.target.value); // 使用 setNestedValue 设置嵌套数据
                        item.value = getNestedValue(this.proxy, key); // 重新绑定更新后的数据
                    });
                } else {
                    item.value = this.proxy[key]; // 直接处理顶层属性
                    item.addEventListener('input', (event) => {
                        this.proxy[key] = event.target.value; // 直接设置顶层属性
                        item.value = this.proxy[key]; // 重新绑定更新后的数据
                    });
                }
            }
        });
    };
    BindingSelect = () => {
        const formItems = this.node.querySelectorAll("select");
        formItems.forEach(item => {
            const key = item.getAttribute("data-binding");
            if (key) {
                const needsNestedHandling = key.includes('.') || key.includes('[');
                if (needsNestedHandling) {
                    item.value = getNestedValue(this.proxy, key);
                    item.addEventListener('change', (event) => {
                        setNestedValue(this.proxy, key, event.target.value);
                        item.value = getNestedValue(this.proxy, key);
                    });
                } else {
                    item.value = this.proxy[key];
                    item.addEventListener('change', (event) => {
                        this.proxy[key] = event.target.value;
                        item.value = this.proxy[key];
                    });
                }
            }
        });
    };

    BindingRadio = () => {
        const radioButtons = Array.from(this.node.querySelectorAll("input[type='radio']"));
        radioButtons.forEach(radio => {
            const key = radio.getAttribute('data-binding');
            if (key) {
                const needsNestedHandling = key.includes('.') || key.includes('[');
                if (needsNestedHandling) {
                    radio.checked = radio.value === getNestedValue(this.proxy, key);
                    radio.addEventListener('change', () => {
                        setNestedValue(this.proxy, key, radio.value);
                        radio.checked = radio.value === getNestedValue(this.proxy, key);
                    });
                } else {
                    radio.checked = radio.value === this.proxy[key];
                    radio.addEventListener('change', () => {
                        this.proxy[key] = radio.value;
                        radio.checked = radio.value === this.proxy[key];
                    });
                }
            }
        });
    };

    BindingCheckbox = () => {
        const checkboxButtons = Array.from(this.node.querySelectorAll("input[type='checkbox']"));
        checkboxButtons.forEach(checkbox => {
            const key = checkbox.getAttribute('data-binding');
            if (key) {
                const needsNestedHandling = key.includes('.') || key.includes('[');
                if (needsNestedHandling) {
                    const values = getNestedValue(this.proxy, key) || [];
                    checkbox.checked = values.includes(checkbox.value);
                    checkbox.addEventListener('change', () => {
                        let updatedValues = getNestedValue(this.proxy, key) || [];
                        if (checkbox.checked) {
                            if (!updatedValues.includes(checkbox.value)) {
                                updatedValues.push(checkbox.value);
                            }
                        } else {
                            updatedValues = updatedValues.filter(value => value !== checkbox.value);
                        }
                        setNestedValue(this.proxy, key, updatedValues);
                        checkbox.checked = updatedValues.includes(checkbox.value);
                    });
                } else {
                    checkbox.checked = this.proxy[key].includes(checkbox.value);
                    checkbox.addEventListener('change', () => {
                        if (checkbox.checked) {
                            if (!this.proxy[key].includes(checkbox.value)) {
                                this.proxy[key].push(checkbox.value);
                            }
                        } else {
                            let index = this.proxy[key].indexOf(checkbox.value);
                            if (index !== -1) {
                                this.proxy[key].splice(index, 1);
                            }
                        }
                        checkbox.checked = this.proxy[key].includes(checkbox.value);
                    });
                }
            }
        });
    };


    DataBinding() {
        this.BindingText();
        this.BindingSelect();
        this.BindingRadio();
        this.BindingCheckbox();
    };

    Render() {
        try {
            const newHtml = this.template(this.proxy);
            // 解析新的HTML
            const parser = new DOMParser();
            const newDoc = parser.parseFromString("<div>" + newHtml + "</div>", 'text/html');
            const newDom = newDoc.body.firstChild.childNodes;
            // 比较旧的和新的DOM结构，进行局部更新
            if (this.previousDom) {
                newDom.forEach((newNode, i) => {
                    const oldNode = this.node.childNodes[i];
                    if (!oldNode || newNode.isEqualNode(oldNode)) {
                        return;
                    } else {
                        oldNode.replaceWith(newNode.cloneNode(true));
                    }
                });
            } else {
                this.node.replaceChildren(...newDom);
            }
            // 更新表单绑定
            this.DataBinding();

            // 保存当前的DOM结构以便下次比较
            this.previousDom = newDom;

        } catch (error) {
            console.error('Render error:', error);
        }
    };
    ReloadData = (data, proxy) => {
        if (Array.isArray(data)) {
            proxy.splice(0, proxy.length);
            proxy.push(...data);
        } else if (data.constructor === Object) {
            Object.assign(proxy, {});
            for (let k in data) {
                proxy[k] = data[k];
            }
        }
    };
    GetData = async (url) => {
        return await (await fetch(url)).json();
    };
    FetchData = (url, proxy, beforeOptions = {}, finishedOptions = {}) => {
        if (typeof beforeOptions === 'object' && Object.keys(beforeOptions).length > 0) {
            for (const key in beforeOptions) {
                proxy[key] = beforeOptions[key]
            }
        }
        this.GetData(url).then(result => {
            this.ReloadData(result, proxy);
            if (typeof finishedOptions === 'object' && Object.keys(finishedOptions).length > 0) {
                for (const key in finishedOptions) {
                    proxy[key] = finishedOptions[key];
                }
            }
        });
    };
    currentIndex = 0;
    CreateNavigationHandle = (path, index) => {
        if (typeof path === "string") {
            path = path.split(".");
        }
        let current = this.proxy;
        for (let i = 0; i < path.length - 1; i++) {
            const key = path[i];
            const nextKey = path[i + 1];

            // 检查下一个键是数字（数组索引）还是字符串（对象键）
            if (!isNaN(parseInt(nextKey, 10))) {
                // 如果下一个键是数字，确保当前键是一个数组
                if (!Array.isArray(current[key])) {
                    current[key] = [];
                }
            } else {
                // 如果下一个键是字符串，确保当前键是一个对象
                if (current[key] === undefined || typeof current[key] !== "object" || Array.isArray(current[key])) {
                    current[key] = {};
                }
            }

            // 移动到下一级
            current = current[key];
        }
        // 设置最后一个键的值
        let finalKey = path[path.length - 1];
        if (index !== null && current[finalKey][this.currentIndex]) {
            current[finalKey][this.currentIndex].isActive = '';
        }

        this.currentIndex = index;
        current[finalKey][index].isActive = 'active';
    };
}
function getNestedValue(obj, path) {
    const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');  // 处理数组索引
    return keys.reduce((acc, key) => acc && acc[key], obj);
}

function setNestedValue(obj, path, value) {
    const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');  // 处理数组索引
    const lastKey = keys.pop();
    const target = keys.reduce((acc, key) => acc && acc[key], obj);
    if (target && lastKey !== undefined) {
        target[lastKey] = value;
    }
}


Handlebars.registerHelper('nl2p', function (text) {
    // 转义文本中的HTML字符
    text = Handlebars.Utils.escapeExpression(text);

    // 将文本拆分为段落并包裹在`<p>` 标签中：

    var paragraphs = text.split(/(\r\n|\n|\r)/gm);
    var wrappedParagraphs = paragraphs.map(function (paragraph) {
        if (paragraph.trim() === '') {
            return ''; // 忽略空行
        }
        return '<p>' + paragraph + '</p>';
    }).join('');
    return new Handlebars.SafeString(wrappedParagraphs);
});

Handlebars.registerHelper('plus', function (num) {
    return num + 1;
});

Handlebars.registerHelper("FatherIndex", function (index) {
    this._index = index;
    return this._index;
});
Handlebars.registerHelper('formatDate', function (dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份从0开始计数
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
});
