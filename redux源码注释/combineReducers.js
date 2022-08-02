import ActionTypes from './untils/actionTypes'
import warning from './untils/warning'
import isPlainObject from './untils/isPlainObject'

function getUndefinedStateErrorMessage(key, action) {
    const actionType = action && action.type
    const actionDescription =
      (actionType && `action "${String(actionType)}"`) || 'an action'
  
    return (
      `Given ${actionDescription}, reducer "${key}" returned undefined. ` +
      `To ignore an action, you must explicitly return the previous state. ` +
      `If you want this reducer to hold no value, you can return null instead of undefined.`
    )
  }


function getUnexpectedStateShapeWarningMessage(
    inputState,
    reducers,
    action,
    unexpectedKeyCache
  ) {
    const reducerKeys = Object.keys(reducers)
    const argumentName =
      action && action.type === ActionTypes.INIT
        ? 'preloadedState argument passed to createStore'
        : 'previous state received by the reducer'
  
    if (reducerKeys.length === 0) {
      return (
        'Store does not have a valid reducer. Make sure the argument passed ' +
        'to combineReducers is an object whose values are reducers.'
      )
    }
  
    if (!isPlainObject(inputState)) {
      return (
        `The ${argumentName} has unexpected type of "` +
        {}.toString.call(inputState).match(/\s([a-z|A-Z]+)/)[1] +
        `". Expected argument to be an object with the following ` +
        `keys: "${reducerKeys.join('", "')}"`
      )
    }
  
    const unexpectedKeys = Object.keys(inputState).filter(
      key => !reducers.hasOwnProperty(key) && !unexpectedKeyCache[key]
    )
  
    unexpectedKeys.forEach(key => {
      unexpectedKeyCache[key] = true
    })
  
    if (action && action.type === ActionTypes.REPLACE) return
  
    if (unexpectedKeys.length > 0) {
      return (
        `Unexpected ${unexpectedKeys.length > 1 ? 'keys' : 'key'} ` +
        `"${unexpectedKeys.join('", "')}" found in ${argumentName}. ` +
        `Expected to find one of the known reducer keys instead: ` +
        `"${reducerKeys.join('", "')}". Unexpected keys will be ignored.`
      )
    }
  }

/*
	assertReducerShape(reducers)函数
	输入值分析：
		- reducers 
	输出分析：
		- reducers 
*/
function assertReducerShape(reducers) {
    Object.keys(reducers).forEach(key => {
      const reducer = reducers[key]
      const initialState = reducer(undefined, { type: ActionTypes.INIT })
  
      if (typeof initialState === 'undefined') {
        throw new Error(
          `Reducer "${key}" returned undefined during initialization. ` +
            `If the state passed to the reducer is undefined, you must ` +
            `explicitly return the initial state. The initial state may ` +
            `not be undefined. If you don't want to set a value for this reducer, ` +
            `you can use null instead of undefined.`
        )
      }
  
      if (
        typeof reducer(undefined, {
          type: ActionTypes.PROBE_UNKNOWN_ACTION()
        }) === 'undefined'
      ) {
        throw new Error(
          `Reducer "${key}" returned undefined when probed with a random type. ` +
            `Don't try to handle ${ActionTypes.INIT} or other actions in "redux/*" ` +
            `namespace. They are considered private. Instead, you must return the ` +
            `current state for any unknown actions, unless it is undefined, ` +
            `in which case you must return the initial state, regardless of the ` +
            `action type. The initial state may not be undefined, but can be null.`
        )
      }
    })
  }

/*
	combineReducers函数用于合并reducers
		输入参数说明：
			- reducers：多个reducer
		输出说明：
			- combination 函数 （后面具体分析）
*/
export default function combineReducers(reducers) {
    /*
        mock:
        reducers = {
            reducer1: reducer1,
            reducer2: reducer2,
            ...
            reducern: reducern,
        }
        维护两个变量：
            reducerKeys = [reducer1, reducer2, ..., reducer3]
            finalReducers = {}
    */
    const reducerKeys = Object.keys(reducers)
    const finalReducers = {}
    
    // 以下是浅复制的过程...   得到finalReducers 
    // 遍历reducers
    for (let i = 0; i < reducerKeys.length; i++) {
      const key = reducerKeys[i]
      
      // process.env.NODE_ENV用于判断生产环境或开发环境
      if (process.env.NODE_ENV !== 'production') {
        if (typeof reducers[key] === 'undefined') {
          warning(`No reducer provided for key "${key}"`)
        }
      }
      
      // 如果reducer是一个函数，就添加到finalReducers里面
      if (typeof reducers[key] === 'function') {
        finalReducers[key] = reducers[key]
      }
    }
      
    const finalReducerKeys = Object.keys(finalReducers)
  
    // This is used to make sure we don't warn about the same
    // keys multiple times.
    let unexpectedKeyCache
    if (process.env.NODE_ENV !== 'production') {
      unexpectedKeyCache = {}
    }
  
    // 校验reducers中的reducer
    let shapeAssertionError
    try {
      assertReducerShape(finalReducers)      // --------往上翻这个函数做了什么
    } catch (e) {
      shapeAssertionError = e
    }
      
      
    /*
        combination函数：
        输入参数分析：
            - state：初始值为空对象
            - action：一个对象 {type:xxx, data:xxx}
    */
    return function combination(state = {}, action) {
      if (shapeAssertionError) {
        throw shapeAssertionError
      }
  
      if (process.env.NODE_ENV !== 'production') {
        const warningMessage = getUnexpectedStateShapeWarningMessage(
          state,
          finalReducers,
          action,
          unexpectedKeyCache
        )
        if (warningMessage) {
          warning(warningMessage)
        }
      }
      
      /*
        维护两个变量：
            hasChanged = false
            nextState = {}
      */
      let hasChanged = false   // 用于监听状态有没有改变的
      const nextState = {}
      /*
          mock:
          finalReducers = {
              reducer1: reducer1,
              reducer2: reducer2,
              ...
              reducern: reducern,
            }
            
            finalReducerKeys = [reducer1, reducer2, reducer3, ...]
            
      */
      for (let i = 0; i < finalReducerKeys.length; i++) {  // 遍历finalReducers
        const key = finalReducerKeys[i]					// reducer1, reducer2, reducer3, ...
        const reducer = finalReducers[key]                 // 获取当前reducer: reducer1, reducer2, reducer3
        const previousStateForKey = state[key]             // 获取当前reducer在state
        const nextStateForKey = reducer(previousStateForKey, action)  // reducer纯函数加工状态获得新的state
        if (typeof nextStateForKey === 'undefined') {
          const errorMessage = getUndefinedStateErrorMessage(key, action) // --------往上翻这个函数做了什么
          throw new Error(errorMessage)
        }
        nextState[key] = nextStateForKey                  // nextState里面存入新的state [key=key, value=新的state]
        hasChanged = hasChanged || nextStateForKey !== previousStateForKey   // 小状态改变否？？？
      }
        
      hasChanged =
        hasChanged || finalReducerKeys.length !== Object.keys(state).length   // 整体状态改变否？
      return hasChanged ? nextState : state   // 改变了 返回nextState 否则 返回state 
    }
  }