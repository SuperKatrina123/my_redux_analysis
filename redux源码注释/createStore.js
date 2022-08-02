import $$observable from 'symbol-observable'

import ActionTypes from './utils/actionTypes'
import isPlainObject from './utils/isPlainObject'

/*
	此函数用于创建Redux store（store可以认为是一个管理state的仓库）
		值得注意的是：
			- dispath是改变state的唯一方法【核心概念2：state只读】
			- app里面只能有一个store【核心概念1:单一数据源】：
				如果你的app有很多模块的话，你可以通过多个reducer来管理，通过combineReducer来组合reducer
				
	参数说明：
		1. reducer {Function} 通过前面的说明已经知道reducer是一个纯函数，用于初始化状态和加工状态
		2. preloadedState {any} 初始状态
		3. enhancer {Function} 增强器（可认为是拓展功能），比如中间件等等 Redux 附带的唯一存储增强器是`applyMiddleware()`。
	返回值说明：
		store
			有如下功能：
			- read state 读取状态                     - getSate
			- dispath action 调度动作			      - dispatch
			- subscribe to changes  监听变化          - subscribe
			
			[replaceReducer和observable不是很重要]

*/
export default function createStore(reducer, preloadedState, enhancer) {
    /*
    	Step1：参数校验
    		1. 校验1：直接传入多个enhancers的情况，下面注释说明了，你可能是传入了多个enhancers，直接传入是不对的，你需要把它们组合（compose them）
    		2. 检验2：没传入初始状态的情况，也就是你只穿了两个参数，那么你的第二个参数应该是enhancer，而preloadedState为undefined
    		3. 校验3：检验enhancer是不是一个函数
    		4. 校验4：reducer是不是一个函数
    */
    if (
        (typeof preloadedState === 'function' && typeof enhancer === 'function') ||
        (typeof enhancer === 'function' && typeof arguments[3] === 'function')
    ) {
        throw new Error(
            'It looks like you are passing several store enhancers to ' +
            'createStore(). This is not supported. Instead, compose them ' +
            'together to a single function.'
        )
    }

    if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
        enhancer = preloadedState
        preloadedState = undefined
    }

    if (typeof enhancer !== 'undefined') {
        if (typeof enhancer !== 'function') {
            throw new Error('Expected the enhancer to be a function.')
        }

        return enhancer(createStore)(reducer, preloadedState)
    }

    if (typeof reducer !== 'function') {
        throw new Error('Expected the reducer to be a function.')
    }

    /*
    	Step2：定义内部变量
    		1. 变量1：currentReducer = reducer             | 当前的reducer 
    		2. 变量2：currentState = preloadedState        | 当前的state：可被getState()获取
    		3. 变量3：currentListeners = []                | 监听列表
    		4. 变量4：nextListeners = currentListeners     | 监听列表
    		5. 变量5：isDispatching = false                | 是否正在被dispatch（调度）
    */
    let currentReducer = reducer
    let currentState = preloadedState
    let currentListeners = []
    let nextListeners = currentListeners
    let isDispatching = false

    /*
    	 ensureCanMutateNextListeners函数：
    	 	生成currentListeners的浅拷贝，可以把nextListeners作为临时调度列表
    	 	这可以防止消费者调用的任何错误在调度过程中订阅/取消订阅
    
    */
    function ensureCanMutateNextListeners() {
        if (nextListeners === currentListeners) {
            nextListeners = currentListeners.slice()
        }
    }

    /*
    	getState函数
    		返回当前状态（currentState）
    */
    function getState() {
        /*
        	获取state的时候必须保证这个reducer已经结束工作了，store已经接收到新的state了，才能调用getState
        */
        if (isDispatching) {
            throw new Error(
                'You may not call store.getState() while the reducer is executing. ' +
                'The reducer has already received the state as an argument. ' +
                'Pass it down from the top reducer instead of reading it from the store.'
            )
        }

        return currentState
    }


    /*
    	subscribe函数：作用是订阅监听
    		任何时候dispatch一个action都会调用这个函数【一触即发！】
    		调用action后state object tree的部分可能已经改变了
    		所以可以再去调用getState()读取回调内的当前状态树	
    		
    	参数说明：
    		- listener：监听到变化后执行的函数，比如subscribe(function() {console.log(1)}) 变化后打印1
    	返回值说明：
    		- unsubscribe {Fuction}： 返回一个具有取消订阅功能的函数
    
    */
    function subscribe(listener) {
        /*
        	listener必须是一个函数
        		举个例子，listener是一个render函数，调用subscribe就会重新渲染某部分的页面（取决于你的render函数需要render什么）
        */
        if (typeof listener !== 'function') {
            throw new Error('Expected the listener to be a function.')
        }

        /*
        	同理：获取state的时候必须保证这个reducer已经结束工作了，store已经接收到新的state了，才能调用getState
        	这也就是说明，顺序是 dispatch action -> state改变 -> 被subscribe(listener) 监听到 -> 获取新的状态 -> listener函数调用
        	举例： 计时器：dispatch action [目的在于使得value+1] -> value状态改变 -> 被subscribe(render) 监听到 -> 获取新的state -> 重新渲染
        */
        if (isDispatching) {
            throw new Error(
                'You may not call store.subscribe() while the reducer is executing. ' +
                'If you would like to be notified after the store has been updated, subscribe from a ' +
                'component and invoke store.getState() in the callback to access the latest state. ' +
                'See https://redux.js.org/api-reference/store#subscribelistener for more details.'
            )
        }

        // Sub-Step1: 设置isSubscribed 为 true
        let isSubscribed = true

        // Sub-Step2: (1) 浅复制currentListeners[当前的监听列表]，(2) 把监听函数push到监听列表中
        ensureCanMutateNextListeners()
        nextListeners.push(listener)

        /*
        	unsubscribe函数：具有取消订阅功能
        */
        return function unsubscribe() {
            // 只有isSubscribed为true的才能被取消订阅
            if (!isSubscribed) {
                return
            }

            /*
            	同理：正在被执行的不能取消订阅
            */
            if (isDispatching) {
                throw new Error(
                    'You may not unsubscribe from a store listener while the reducer is executing. ' +
                    'See https://redux.js.org/api-reference/store#subscribelistener for more details.'
                )
            }

            // sub-step3: 修改isSubscribed 为 false
            isSubscribed = false

            // sub-step4: 浅复制监听列表
            ensureCanMutateNextListeners()

            // sub-step5: 监听完毕，从列表中删除它
            const index = nextListeners.indexOf(listener)
            nextListeners.splice(index, 1)
            currentListeners = null;
        }
    }

    /*
    	 dispatch函数：[调度函数] 划重点！回顾：这是改变状态的唯一方法！！！！！ 【核心概念2：state只读】
    	
    	dispatch被调用后，reducer将会被调用，store通过转发dispath(action) 中包含的previousState和action给redeucer，reducer返回newState给store，React component可以通过getState获取newState
    	注意：基本实现仅仅支持普通对象的操作，如果的状态是一个Promise Obserable thunk等等，你需要借助与中间件（middleware） 【后面介绍】
    		参数说明：
    			- action 是一个object，格式为 {type:xxx, data:xxx}
    		返回值说明：
    			- {Object} 为了方便，返回action对象，但是里面的data是经过更改了
    */

    function dispatch(action) {
        /*
        isPlainObject函数不贴代码了~看源码的意思，isPlainObject就是用来判断action是不是一个对象
        */
        if (!isPlainObject(action)) {
            throw new Error(
                'Actions must be plain objects. ' +
                'Use custom middleware for async actions.'
            )
        }

        /*
        只有定义了action.type才能进行后续操作，所以type不能是undefined
        */
        if (typeof action.type === 'undefined') {
            throw new Error(
                'Actions may not have an undefined "type" property. ' +
                'Have you misspelled a constant?'
            )
        }

        /*
        正在被dispath的action不能传入到reducer中处理
        */
        if (isDispatching) {
            throw new Error('Reducers may not dispatch actions.')
        }

        /*
        sub-step1：
        	- 切换isDispatching为true
        	- currentState为currentReducer(currentState, action)处理后返回的state
        		reducer函数举例：
        		function currentReducer(state={count:0}, action) => {
        			if (action.type === 'INCREMENT') {
        				return {...state, count: state.count+1}
        			}
        		}
        执行完毕后，也就是currentState返回后，
        切换isDispatching为false
        */
        try {
            isDispatching = true
            currentState = currentReducer(currentState, action)
        } finally {
            isDispatching = false
        }

        /*
        sub-step2：
        	触发listener函数
        */
        const listeners = (currentListeners = nextListeners)
        for (let i = 0; i < listeners.length; i++) {
            const listener = listeners[i]
            listener()
        }

        return action
    }


    /*
    	replaceReducer函数：替换store当前使用的reducer来计算 state
    		不是特别重要，就是替换当前的reducer
    		
    */
    function replaceReducer(nextReducer) {
        if (typeof nextReducer !== 'function') {
            throw new Error('Expected the nextReducer to be a function.')
        }

        currentReducer = nextReducer

        dispatch({
            type: ActionTypes.REPLACE
        })
    }

    /*
	observable函数：
		不重要~暂时不说了
   */
    function observable() {
        const outerSubscribe = subscribe
        return {

            subscribe(observer) {
                if (typeof observer !== 'object' || observer === null) {
                    throw new TypeError('Expected the observer to be an object.')
                }

                function observeState() {
                    if (observer.next) {
                        observer.next(getState())
                    }
                }

                observeState()
                const unsubscribe = outerSubscribe(observeState)
                return {
                    unsubscribe
                }
            },

            [$$observable]() {
                return this
            }
        }
    }

    dispatch({
        type: ActionTypes.INIT
    })

    return {
        dispatch,
        subscribe,
        getState,
        replaceReducer,
        [$$observable]: observable
    }
}